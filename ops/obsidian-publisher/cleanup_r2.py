"""Remove old R2 media that no current Vault note or unclaimed album references."""
import json
import os
import urllib.error
import urllib.request


DEFAULT_URL = "https://img.215320.xyz/internal/gallery/r2-cleanup"
MIN_GRACE_DAYS = 15


class CleanupFailure(RuntimeError):
    def __init__(self, code):
        super().__init__("R2 cleanup failed")
        self.issue = {"code": code}


def _post(payload, token, transport, timeout=30):
    request = urllib.request.Request(
        os.environ.get("R2_CLEANUP_URL", DEFAULT_URL),
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "obsidian-blog-publisher/1.0",
        },
    )
    try:
        with transport(request, timeout=timeout) as response:
            if response.status != 200:
                raise CleanupFailure("r2_cleanup_response")
            result = json.loads(response.read(1024 * 1024))
    except urllib.error.HTTPError as error:
        raise CleanupFailure("r2_cleanup_auth" if error.code in (401, 403)
                             else "r2_cleanup_response") from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise CleanupFailure("r2_cleanup_network") from None
    except (ValueError, TypeError):
        raise CleanupFailure("r2_cleanup_response") from None
    if not isinstance(result, dict) or result.get("ok") is not True:
        raise CleanupFailure("r2_cleanup_response")
    return result


def cleanup_r2(protected_sources, managed_album_ids, token,
               grace_days=MIN_GRACE_DAYS, transport=urllib.request.urlopen):
    if not token:
        raise CleanupFailure("r2_cleanup_auth")
    if not isinstance(grace_days, int) or grace_days < MIN_GRACE_DAYS:
        raise CleanupFailure("r2_cleanup_config")
    payload = {
        "protectedSources": protected_sources if isinstance(protected_sources, list) else [],
        "managedAlbumIds": managed_album_ids if isinstance(managed_album_ids, list) else [],
        "graceDays": grace_days,
    }
    preview = _post({**payload, "dryRun": True}, token, transport)
    if not isinstance(preview.get("candidateCount"), int) or preview["candidateCount"] < 0:
        raise CleanupFailure("r2_cleanup_response")
    if preview["candidateCount"] == 0:
        return {**preview, "status": "completed"}

    result = _post({
        **payload,
        "dryRun": False,
        "confirm": "delete-unreferenced-r2",
    }, token, transport)
    if not isinstance(result.get("deleted"), int) or result["deleted"] < 0:
        raise CleanupFailure("r2_cleanup_response")
    return {**result, "status": "completed"}
