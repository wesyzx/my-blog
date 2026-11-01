"""Build unsigned workflows using property metadata exported from this iPhone.

Sign with Apple's `shortcuts sign --mode anyone --input ... --output ...`.
Public builds contain no health values or authentication token. Personal builds
store the token in a private temporary directory and must never be shared.

Two families of shortcuts are generated:

* summary uploads read a workout through the Actions app's Find Workout action
  and post calories, duration, the workout's own average heart rate and
  flights-climbed samples from the workout window to `/internal/healthkit`;
* the GPX upload exports the latest workout with a route using WorkoutGPX and posts it to
  `/internal/route`. The Worker reads the first timestamp inside the file and
  matches the workout itself, so the file alone is enough;
* `一键同步运动到博客` chains both steps in a single run: the summary is
  posted first, and each exported GPX file is then uploaded separately.
  An empty export skips the route loop. Export errors can still stop the run,
  and the export may select an older workout that has GPS.

The three daily shortcuts are emitted by default. The
preview and multi-select variants stay available for troubleshooting behind
`--all`; they are neither installed nor published.
"""
import copy
import argparse
import getpass
import os
import pathlib
import plistlib
import uuid

ROOT = pathlib.Path(__file__).resolve().parent
TEMPLATE = plistlib.load(open(ROOT / 'actions-template.plist', 'rb'))
# Actions exposes these workout properties with the same property metadata as
# the ones already exported from this iPhone, so the exported template only
# needs the identifier swapped. `endDate` is used for preview diagnostics;
# `averageHeartRate` replaces the abandoned Health sample query.
for extra_property in ['endDate', 'averageHeartRate']:
    property_metadata = copy.deepcopy(TEMPLATE['properties']['startDate'])
    property_metadata['PropertyName'] = extra_property
    property_metadata['PropertyUserInfo']['WFLinkEntityContentPropertyUserInfoPropertyIdentifier'] = extra_property
    TEMPLATE['properties'][extra_property] = property_metadata


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


def save_workflow(workflow, name, personal_token=None, output_dir=None):
    directory = pathlib.Path(output_dir or '/private/tmp')
    directory.mkdir(parents=True, exist_ok=True)
    if personal_token:
        if output_dir is None:
            directory /= 'personal-workout-shortcuts'
        directory.mkdir(mode=0o700, exist_ok=True)
        directory.chmod(0o700)
        token_ids = set()
        for entry in workflow['WFWorkflowActions']:
            params = entry['WFWorkflowActionParameters']
            if entry['WFWorkflowActionIdentifier'] == 'is.workflow.actions.ask' and '令牌' in params.get('WFAskActionPrompt', ''):
                token_ids.add(params['UUID'])
                entry['WFWorkflowActionIdentifier'] = 'is.workflow.actions.gettext'
                entry['WFWorkflowActionParameters'] = {
                    'UUID': params['UUID'], 'WFTextActionText': text(personal_token),
                }
            if 'WFCommentActionText' in params:
                params['WFCommentActionText'] = params['WFCommentActionText'].replace(
                    '令牌仅本次输入。', '个人自用版已配置上传令牌，请勿分享或导出给他人。'
                ).replace('令牌仅本次输入，不会写入文件。', '个人自用版已配置上传令牌，请勿分享或导出给他人。')

        def update_reference(value):
            if isinstance(value, dict):
                if value.get('OutputUUID') in token_ids:
                    value['OutputName'] = 'Text'
                for child in value.values():
                    update_reference(child)
            elif isinstance(value, list):
                for child in value:
                    update_reference(child)

        update_reference(workflow)
    workflow['WFWorkflowName'] = name
    target = directory / (name + '-unsigned.shortcut')
    # Use exclusive creation so an existing file cannot redirect a secret build.
    if personal_token:
        target = directory / (name + '-' + uid() + '-unsigned.shortcut')
    with target.open('xb' if personal_token else 'wb') as destination:
        os.chmod(target, 0o600)
        plistlib.dump(workflow, destination, fmt=plistlib.FMT_BINARY)
    print(target)


def _summary_actions(actions, action, upload, latest=True, intro=None):
    """Append the summary half of the flow.

    Returns `(response output id, response output name, token action id)` so a
    caller can both display the result and reuse the same token for a second
    request. `latest` reads the newest workout; otherwise the caller wraps these
    actions in a "Repeat with each item" loop over a chosen list, which is what
    the multi-select troubleshooting variant needs.
    """
    if intro is None:
        intro = ('读取 Apple 健康中的运动摘要（时长、动态热量、平均心率）'
                 '以及运动时段内的已爬楼层。'
                 + ('读取第一条运动（当前实机为最近一条）。' if latest else '选择要处理的运动，逐条读取。')
                 + '不读取或上传 GPS 轨迹。')
    action('comment', WFCommentActionText=(
        intro
        + ('上传目的地是你的博客 workouts.wesyzx.workers.dev。' if upload else '本指令只在本机预览，不发送数据。')))
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
    # The token prompt is always emitted: `save_workflow` rewrites this exact
    # action into a literal for personal builds, so it must exist either way.
    if upload:
        token_id = action('ask', WFAskActionPrompt='输入博客运动上传令牌（仅本次使用）', WFInputType='Text')
    values = {}
    if latest:
        for name in ['id', 'workoutType', 'startDate', 'endDate', 'duration', 'activeCalories',
                     'averageHeartRate']:
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
    ended_id = action('format.date', WFDate=text(ref=property_ref('endDate')),
                      WFDateFormatStyle='Custom', WFDateFormat="yyyy-MM-dd'T'HH:mm:ssXXX")

    def number_ref(name):
        ref = property_ref(name)
        ref.setdefault('Aggrandizements', []).append(
            {'Type': 'WFCoercionVariableAggrandizement', 'CoercionItemClass': 'WFNumberContentItem'})
        return ref

    # Actions does not expose a climb property. Query the workout's own time
    # window for HealthKit's Flights Climbed quantity and sum its samples.
    # This is a count of floors, not elevation in metres.
    action('comment', WFCommentActionText=(
        '爬楼层数取自“查找健康样本”：类型为“已爬楼层”，开始时间落在本次运动的起止区间内，'
        '再计算总和。它只表示爬了几层，不会换算成米或加入累计爬升。'
        '没有样本时后端保留已有值。'))
    flights_id = action('filter.health.quantity', WFContentItemFilter={
        'Value': {
            'WFActionParameterFilterPrefix': 1,
            'WFContentPredicateBoundedDate': False,
            'WFActionParameterFilterTemplates': [
                {'Bounded': True, 'Operator': 4, 'Property': 'Type', 'Removable': False,
                 'Values': {'Enumeration': {'Value': 'Flights Climbed',
                                            'WFSerializationType': 'WFStringSubstitutableState'}}},
                {'Bounded': True, 'Operator': 1003, 'Property': 'Start Date', 'Removable': False,
                 'Values': {'Date': attachment(property_ref('startDate')),
                            'AnotherDate': attachment(output(ended_id, 'Formatted Date'))}},
            ],
        },
        'WFSerializationType': 'WFContentPredicateTableTemplate',
    })
    flights_values_id = action('properties.health.quantity',
                               WFContentItemPropertyName='Value',
                               WFInput=attachment(output(flights_id, 'Health Samples')))
    flights_total_id = action('statistics', WFStatisticsOperation='Sum',
                              WFInput=attachment(output(flights_values_id, 'Details of Health Sample')))

    # Read the workout's own average heart rate from Actions. The earlier
    # "Find Health Samples" detour is gone: a native query filtered to the
    # workout window returned 0 samples on this device even though the same
    # window has recorded heart-rate data, while `averageHeartRate` reads the
    # real value (verified on device at 136.73 bpm for the stairs workout).
    action('comment', WFCommentActionText=(
        '心率直接取运动的“平均心率”属性，由 Actions 从 Apple 健康读取，'
        '不再按时间窗查询原始心率样本；没有数据时结果为空，后端不会用它覆盖已有心率。\n'
        '把一次运动整理成一条记录。'
        + ('上传到博客；结果会显示服务端返回的 JSON，便于确认是否成功。' if upload else '本指令只在本机显示这条记录，不发送数据。')))
    items = [('source', text('apple-health'), 0),
             ('id', text(ref=property_ref('id')), 0),
             ('type', text(ref=property_ref('workoutType')), 0),
             ('startedAt', text(ref=output(started_id, 'Formatted Date')), 0),
             ('localDate', text(ref=output(local_id, 'Formatted Date')), 0),
             ('durationSeconds', text(ref=number_ref('duration')), 0),
             ('activeEnergyKcal', text(ref=number_ref('activeCalories')), 0),
             ('averageHeartRateBpm', text(ref=number_ref('averageHeartRate')), 0),
             ('flightsClimbed', text(ref=output(flights_total_id, 'Statistics')), 0)]
    if not upload:
        # Keep diagnostics local; they are not part of the ingest contract.
        items.extend([
            ('endedAt', text(ref=output(ended_id, 'Formatted Date')), 0),
            ('rawAverageHeartRate', text(ref=property_ref('averageHeartRate')), 0),
        ])
    body = dictionary(items)
    if upload:
        headers = [('Content-Type', text('application/json'), 0)]
        if token_id:
            headers.insert(0, ('Authorization', text('Bearer ', output(token_id, 'Provided Input')), 0))
        response_id = action('downloadurl',
                             WFURL='https://workouts.wesyzx.workers.dev/internal/healthkit',
                             WFHTTPMethod='POST', WFHTTPBodyType='JSON', WFJSONValues=body,
                             WFHTTPHeaders=dictionary(headers))
        result_id, result_name = response_id, 'Contents of URL'
    else:
        result_id = action('dictionary', WFItems=body)
        result_name = 'Dictionary'
    if group:
        result_id = action('repeat.each', GroupingIdentifier=group, WFControlFlowMode=2)
        result_name = 'Repeat Results'
    return result_id, result_name, token_id


def build(upload, latest=True, personal_token=None, output_dir=None):
    workflow = copy.deepcopy(TEMPLATE['workflow'])
    # These shortcuts read Health and post a request; they never consume
    # Shortcut Input, so advertising input types only produces a stale
    # "Shortcut Input" row in the editor.
    workflow['WFWorkflowInputContentItemClasses'] = []
    actions = []

    def action(name, **params):
        identifier = uid()
        params['UUID'] = identifier
        actions.append({'WFWorkflowActionIdentifier': 'is.workflow.actions.' + name,
                        'WFWorkflowActionParameters': params})
        return identifier

    result_id, result_name, _token_id = _summary_actions(
        actions, action, upload, latest=latest)
    # Display the real response/data; completion alone does not imply success.
    action('previewdocument', WFInput=attachment(output(result_id, result_name)))
    workflow['WFWorkflowActions'] = actions
    name = ('同步最近运动到博客' if upload else '预览最近运动上传数据') if latest else ('同步运动到博客' if upload else '预览运动上传数据')
    save_workflow(workflow, name, personal_token, output_dir)


def _gpx_export_action(actions):
    """Append the WorkoutGPX export action and return its output reference.

    The descriptor was exported from the user's iPhone, not inferred from the
    localized action title. The actual intent name includes "Intent".
    """
    export_action = plistlib.load(open(ROOT / 'workoutgpx-template.plist', 'rb'))
    file_id = uid()
    export_action['WFWorkflowActionParameters']['UUID'] = file_id
    actions.append(export_action)
    return file_id


def build_gpx(upload=True, personal_token=None, output_dir=None):
    """Export the latest GPS workout and post its GPX to the route endpoint.

    The Worker matches the workout from the first `<time>` inside the track,
    so this shortcut does not need to know a UUID or start time.
    """
    workflow = copy.deepcopy(TEMPLATE['workflow'])
    workflow['WFWorkflowInputContentItemClasses'] = []
    actions = []

    def action(name, **params):
        identifier = uid()
        params['UUID'] = identifier
        actions.append({'WFWorkflowActionIdentifier': 'is.workflow.actions.' + name,
                        'WFWorkflowActionParameters': params})
        return identifier

    action('comment', WFCommentActionText=(
        '自动导出最近一次带 GPS 轨迹的运动并上传到博客，不需要手动选择文件。'
        '先运行“同步最近运动到博客”上传这次运动的摘要。'
        'Worker 会用文件内的第一个时间戳自动匹配已有运动，只补充轨迹、距离和爬升，'
        '不覆盖健康 App 已经测到的时长与热量。'
        + ('令牌仅本次输入，不会写入文件。' if upload else '本指令只在本机预览，不发送数据。')))

    file_id = _gpx_export_action(actions)

    token_id = None
    if upload:
        token_id = action('ask', WFAskActionPrompt='输入博客运动上传令牌（仅本次使用）', WFInputType='Text')
        response_id = action('downloadurl',
                             WFURL='https://workouts.wesyzx.workers.dev/internal/route',
                             WFHTTPMethod='POST', WFHTTPBodyType='File',
                             WFRequestVariable=attachment(output(file_id, 'GPX File')),
                             WFHTTPHeaders=dictionary([
                                 ('Authorization', text('Bearer ', output(token_id, 'Provided Input')), 0),
                                 ('Content-Type', text('application/gpx+xml'), 0)]))
        result_id, result_name = response_id, 'Contents of URL'
    else:
        result_id, result_name = file_id, 'GPX File'

    action('previewdocument', WFInput=attachment(output(result_id, result_name)))
    workflow['WFWorkflowActions'] = actions
    name = '上传运动轨迹到博客' if upload else '预览运动轨迹文件'
    save_workflow(workflow, name, personal_token, output_dir)


def build_combined(personal_token=None, name='一键同步运动到博客', output_dir=None):
    """Post the latest summary, then upload each GPX returned by WorkoutGPX."""
    workflow = copy.deepcopy(TEMPLATE['workflow'])
    workflow['WFWorkflowInputContentItemClasses'] = []
    actions = []

    def action(identifier_name, **params):
        identifier = uid()
        params['UUID'] = identifier
        actions.append({'WFWorkflowActionIdentifier': 'is.workflow.actions.' + identifier_name,
                        'WFWorkflowActionParameters': params})
        return identifier

    intro = ('一步到位：读取最近一次运动，先上传摘要，再尝试上传 GPS 轨迹。'
             '轨迹取最近一次有 GPS 的运动，可能早于本次摘要；导出结果为空时跳过轨迹上传。')
    summary_id, summary_name, summary_token_id = _summary_actions(
        actions, action, True, latest=True, intro=intro)

    file_id = _gpx_export_action(actions)
    # An empty export skips this loop; an export error can still stop the run.
    group = uid()
    action('repeat.each', GroupingIdentifier=group, WFControlFlowMode=0,
           WFInput=attachment(output(file_id, 'GPX File')))
    # The summary half already asked for (or inlined) the token, so reuse that
    # same output rather than prompting a second time.
    token_id = summary_token_id
    headers = [('Content-Type', text('application/gpx+xml'), 0),
               ('Authorization', text('Bearer ', output(token_id, 'Provided Input')), 0)]
    route_id = action('downloadurl',
                      WFURL='https://workouts.wesyzx.workers.dev/internal/route',
                      WFHTTPMethod='POST', WFHTTPBodyType='File',
                      WFRequestVariable=attachment({'Type': 'Variable', 'VariableName': 'Repeat Item'}),
                      WFHTTPHeaders=dictionary(headers))
    action('previewdocument', WFInput=attachment(output(route_id, 'Contents of URL')))
    action('repeat.each', GroupingIdentifier=group, WFControlFlowMode=2)
    action('comment', WFCommentActionText=(
        '请确认摘要和轨迹响应均包含 ok: true；没有导出文件时只显示摘要响应。'))
    action('previewdocument', WFInput=attachment(output(summary_id, summary_name)))
    workflow['WFWorkflowActions'] = actions
    save_workflow(workflow, name, personal_token, output_dir)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--all', action='store_true', help='Also build troubleshooting variants')
    parser.add_argument('--personal', action='store_true', help='Build private shortcuts with a saved token')
    parser.add_argument('--output-dir', help='Write unsigned shortcuts here instead of /private/tmp')
    options = parser.parse_args()
    token = None
    if options.personal:
        token = os.environ.get('INGEST_TOKEN') or getpass.getpass('上传令牌（仅写入本机个人版）：')
        token = token.strip()
        if not token:
            parser.error('个人版需要上传令牌')
    build(True, personal_token=token, output_dir=options.output_dir)
    build_gpx(True, personal_token=token, output_dir=options.output_dir)
    build_combined(personal_token=token, output_dir=options.output_dir)
    if options.all:
        build(False, output_dir=options.output_dir)
        build(False, latest=False, output_dir=options.output_dir)
        build(True, latest=False, output_dir=options.output_dir)
        build_gpx(False, output_dir=options.output_dir)
