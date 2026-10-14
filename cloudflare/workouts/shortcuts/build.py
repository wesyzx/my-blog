"""Build unsigned workflows using property metadata exported from this iPhone.

Sign with Apple's `shortcuts sign --mode anyone --input ... --output ...`.
No health values or authentication token are included in these files.

Two families of shortcuts are generated:

* summary uploads read a workout through the Actions app's Find Workout action
  and post calories/duration to `/internal/healthkit`;
* the GPX upload picks a `.gpx` file exported by WorkoutGPX and posts it to
  `/internal/route`. The Worker reads the first timestamp inside the file and
  matches the workout itself, so the file alone is enough.
"""
import copy
import pathlib
import plistlib
import uuid

ROOT = pathlib.Path(__file__).resolve().parent
TEMPLATE = plistlib.load(open(ROOT / 'actions-template.plist', 'rb'))


def uid():
    return str(uuid.uuid4()).upper()


def attachment(ref):
    return {'WFSerializationType': 'WFTextTokenAttachment', 'Value': ref}


def output(identifier, name):
    return {'Type': 'ActionOutput', 'OutputUUID': identifier, 'OutputName': name}


def text(value='', ref=None):
    state = {'string': value + ('\ufffc' if ref else '')}
    if ref:
        state['attachmentsByRange'] = {'{%d, 1}' % len(value): ref}
    return {'WFSerializationType': 'WFTextTokenString', 'Value': state}


def dictionary(items):
    return {'WFSerializationType': 'WFDictionaryFieldValue', 'Value': {
        'WFDictionaryFieldValueItems': [
            {'WFItemType': kind, 'WFKey': text(key), 'WFValue': value}
            for key, value, kind in items
        ]}}


def build(upload, latest=True):
    workflow = copy.deepcopy(TEMPLATE['workflow'])
    actions = []

    def action(name, **params):
        identifier = uid()
        params['UUID'] = identifier
        actions.append({'WFWorkflowActionIdentifier': 'is.workflow.actions.' + name,
                        'WFWorkflowActionParameters': params})
        return identifier

    action('comment', WFCommentActionText=(
        ('读取 Apple 健康中的运动摘要。' + ('读取第一条运动（当前实机为最近一条）。' if latest else '选择要处理的运动，逐条读取。') + '不读取或上传 GPS 轨迹。')
        + ('上传目的地是你的博客 workouts.wesyzx.workers.dev；令牌仅本次输入。' if upload else '本指令只在本机预览，不发送数据。')))
    query = copy.deepcopy(TEMPLATE['query'])
    query_id = uid()
    query['WFWorkflowActionParameters']['UUID'] = query_id
    actions.append(query)
    token_id = None
    group = None
    if not latest:
        choose_id = action('choosefromlist', WFInput=attachment(output(query_id, 'Workouts')),
                           WFChooseFromListActionPrompt='选择要上传的运动' if upload else '选择要预览的运动',
                           WFChooseFromListActionSelectMultiple=True,
                           WFChooseFromListActionSelectAll=False)
    if upload:
        token_id = action('ask', WFAskActionPrompt='输入博客运动上传令牌（仅本次使用）', WFInputType='Text')
    values = {}
    if latest:
        for name in ['id', 'workoutType', 'startDate', 'duration', 'activeCalories']:
            ref = output(query_id, 'Workouts')
            ref['Aggrandizements'] = [copy.deepcopy(TEMPLATE['properties'][name])]
            values[name] = action('getitemfromlist', WFItemSpecifier='First Item', WFInput=attachment(ref))
    else:
        group = uid()
        action('repeat.each', GroupingIdentifier=group, WFControlFlowMode=0,
               WFInput=attachment(output(choose_id, 'Chosen Item')))

    def property_ref(name):
        if latest:
            return output(values[name], 'Item from List')
        return {'Type': 'Variable', 'VariableName': 'Repeat Item',
                'Aggrandizements': [copy.deepcopy(TEMPLATE['properties'][name])]}

    started_id = action('format.date', WFDate=text(ref=property_ref('startDate')),
                        WFDateFormatStyle='Custom', WFDateFormat="yyyy-MM-dd'T'HH:mm:ssXXX")
    local_id = action('format.date', WFDate=text(ref=property_ref('startDate')),
                      WFDateFormatStyle='Custom', WFDateFormat='yyyy-MM-dd')
    duration = property_ref('duration')
    duration.setdefault('Aggrandizements', []).append(
        {'Type': 'WFCoercionVariableAggrandizement', 'CoercionItemClass': 'WFNumberContentItem'})
    items = [('source', text('apple-health'), 0),
             ('id', text(ref=property_ref('id')), 0),
             ('type', text(ref=property_ref('workoutType')), 0),
             ('startedAt', text(ref=output(started_id, 'Formatted Date')), 0),
             ('localDate', text(ref=output(local_id, 'Formatted Date')), 0),
             ('durationSeconds', text(ref=duration), 0),
             ('activeEnergyKcal', text(ref=property_ref('activeCalories')), 0)]
    body = dictionary(items)
    if upload:
        response_id = action('downloadurl',
                             WFURL='https://workouts.wesyzx.workers.dev/internal/healthkit',
                             WFHTTPMethod='POST', WFHTTPBodyType='JSON', WFJSONValues=body,
                             WFHTTPHeaders=dictionary([
                                 ('Authorization', text('Bearer ', output(token_id, 'Provided Input')), 0),
                                 ('Content-Type', text('application/json'), 0)]))
        result_id, result_name = response_id, 'Contents of URL'
    else:
        result_id = action('dictionary', WFItems=body)
        result_name = 'Dictionary'
    if group:
        result_id = action('repeat.each', GroupingIdentifier=group, WFControlFlowMode=2)
        result_name = 'Repeat Results'
    # Display the real response/data; completion alone does not imply success.
    action('previewdocument', WFInput=attachment(output(result_id, result_name)))
    workflow['WFWorkflowActions'] = actions
    name = ('同步最近运动到博客' if upload else '预览最近运动上传数据') if latest else ('同步运动到博客' if upload else '预览运动上传数据')
    workflow['WFWorkflowName'] = name
    target = pathlib.Path('/private/tmp') / (name + '-unsigned.shortcut')
    plistlib.dump(workflow, open(target, 'wb'), fmt=plistlib.FMT_BINARY)
    print(target)


def build_gpx(upload=True):
    """Pick a GPX file and post it to the route endpoint.

    The Worker matches the workout from the first `<time>` inside the track,
    so this shortcut does not need to know a UUID or start time.
    """
    workflow = copy.deepcopy(TEMPLATE['workflow'])
    actions = []

    def action(name, **params):
        identifier = uid()
        params['UUID'] = identifier
        actions.append({'WFWorkflowActionIdentifier': 'is.workflow.actions.' + name,
                        'WFWorkflowActionParameters': params})
        return identifier

    action('comment', WFCommentActionText=(
        '选择 WorkoutGPX 导出的 .gpx 文件并上传到博客。'
        'Worker 会用文件内的第一个时间戳自动匹配已有运动，只补充轨迹、距离和爬升，'
        '不覆盖健康 App 已经测到的时长与热量。'
        + ('令牌仅本次输入，不会写入文件。' if upload else '本指令只在本机预览，不发送数据。')))

    # `WFFile` with `{Type: Ask}` opens the Files picker at run time.
    file_id = action('file', WFFile={
        'Value': {'Type': 'Ask'},
        'WFSerializationType': 'WFTextTokenAttachment',
    })

    token_id = None
    if upload:
        token_id = action('ask', WFAskActionPrompt='输入博客运动上传令牌（仅本次使用）', WFInputType='Text')
        response_id = action('downloadurl',
                             WFURL='https://workouts.wesyzx.workers.dev/internal/route',
                             WFHTTPMethod='POST', WFHTTPBodyType='File',
                             WFRequestVariable=attachment(output(file_id, 'File')),
                             WFHTTPHeaders=dictionary([
                                 ('Authorization', text('Bearer ', output(token_id, 'Provided Input')), 0),
                                 ('Content-Type', text('application/gpx+xml'), 0)]))
        result_id, result_name = response_id, 'Contents of URL'
    else:
        # Preview the chosen file so the run can be verified without network.
        result_id, result_name = file_id, 'File'

    action('previewdocument', WFInput=attachment(output(result_id, result_name)))
    workflow['WFWorkflowActions'] = actions
    name = '上传运动轨迹到博客' if upload else '预览运动轨迹文件'
    workflow['WFWorkflowName'] = name
    target = pathlib.Path('/private/tmp') / (name + '-unsigned.shortcut')
    plistlib.dump(workflow, open(target, 'wb'), fmt=plistlib.FMT_BINARY)
    print(target)


if __name__ == '__main__':
    build(False)
    build(True)
    build(False, latest=False)
    build(True, latest=False)
    build_gpx(False)
    build_gpx(True)
