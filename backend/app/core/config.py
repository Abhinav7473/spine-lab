from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    arxiv_base_url: str = "https://export.arxiv.org/api/query"
    cors_origins: str = "http://localhost:5173"  # comma-separated list
    fetch_api_key: str = ""       # set in production to protect /papers/fetch

    # Access control
    # Your personal dev code — set in .env, never stored in DB.
    # Anyone with this code gets role='dev' and admin access.
    dev_access_code: str = "SPINE-DEV-LOCAL"

    # ArXiv fetching
    # Minimum minutes between fetches of the same topic (in-memory cooldown).
    # Prevents hammering ArXiv with duplicate topic requests.
    arxiv_cooldown_mins: int = 15

    # Feed ranking
    # Number of reading sessions required before behavioral re-ranking activates.
    # Below this threshold, the feed falls back to pure recency (cold start).
    min_sessions_reranking: int = 5

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
