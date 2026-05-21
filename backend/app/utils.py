from datetime import datetime, timedelta, timezone


def get_date_range(timeframe: str, tz_offset_hours: int = 5) -> datetime:
    """
    Return the UTC start datetime for the given timeframe.

    tz_offset_hours: the client's UTC offset (e.g. 5 for PKT UTC+5).
    All stored timestamps are UTC, so we subtract the offset to get the
    correct UTC boundary that corresponds to local midnight.
    """
    tz = timezone(timedelta(hours=tz_offset_hours))
    now_local = datetime.now(tz)

    if timeframe == "daily":
        # Local midnight today → convert back to UTC
        local_midnight = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = local_midnight.astimezone(timezone.utc).replace(tzinfo=None)

    elif timeframe == "yesterday":
        # Local midnight yesterday → convert back to UTC
        local_yesterday = (now_local - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = local_yesterday.astimezone(timezone.utc).replace(tzinfo=None)

    elif timeframe == "weekly":
        # Most recent Monday in local time → UTC
        local_today = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        local_monday = local_today - timedelta(days=local_today.weekday())
        start_date = local_monday.astimezone(timezone.utc).replace(tzinfo=None)

    elif timeframe == "monthly":
        # First day of current local month → UTC
        local_month_start = now_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start_date = local_month_start.astimezone(timezone.utc).replace(tzinfo=None)

    elif timeframe == "yearly":
        # First day of current local year → UTC
        local_year_start = now_local.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        start_date = local_year_start.astimezone(timezone.utc).replace(tzinfo=None)

    else:
        # "all" or unknown → no lower bound
        start_date = datetime.min

    return start_date


def get_end_of_day_utc(date_str: str, tz_offset_hours: int = 5) -> tuple[datetime, datetime]:
    """
    Given a date string like '2026-05-20', return (start_utc, end_utc)
    representing the full local day in UTC.
    e.g. for PKT (UTC+5): 2026-05-20 00:00 PKT → 2026-05-19 19:00 UTC
                           2026-05-20 23:59 PKT → 2026-05-20 18:59 UTC
    """
    tz = timezone(timedelta(hours=tz_offset_hours))
    local_date = datetime.strptime(date_str, "%Y-%m-%d")
    local_start = local_date.replace(tzinfo=tz)
    local_end = (local_date + timedelta(days=1)).replace(tzinfo=tz)
    start_utc = local_start.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = local_end.astimezone(timezone.utc).replace(tzinfo=None)
    return start_utc, end_utc
