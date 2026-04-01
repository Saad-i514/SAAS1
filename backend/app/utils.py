from datetime import datetime, timedelta

def get_date_range(timeframe: str):
    now = datetime.utcnow()
    # Resetting time components to 00:00:00 for strict calendar boundaries
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if timeframe == "daily":
        start_date = today
    elif timeframe == "weekly":
        # Calculate most recent Monday (0 = Monday)
        start_date = today - timedelta(days=today.weekday())
    elif timeframe == "monthly":
        start_date = today.replace(day=1)
    elif timeframe == "yearly":
        start_date = today.replace(month=1, day=1)
    else:
        # "all" or any unknown value → no date filter
        start_date = datetime.min
    return start_date
