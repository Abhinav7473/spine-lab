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

    # OAuth — register apps for free at:
    #   Google:  console.cloud.google.com → APIs & Services → Credentials
    #   GitHub:  github.com/settings/applications/new
    # Leave blank to keep OAuth buttons disabled (access-code login still works).
    app_base_url:          str = "http://localhost:8000"
    # No default — startup fails loudly if not set.
    # Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    jwt_secret:            str
    google_client_id:      str = ""
    google_client_secret:  str = ""
    github_client_id:      str = ""
    github_client_secret:  str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
