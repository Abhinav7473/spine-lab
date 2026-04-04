Fetch CS.AI papers from ArXiv for a given topic and upsert them into the database.

Ask the user for a topic if not provided, then call the backend endpoint:

```bash
curl -s -X POST http://localhost:8000/api/papers/fetch \
  -H "Content-Type: application/json" \
  -d '{"topic": "$TOPIC", "max_results": 25}' | python3 -m json.tool
```

If the server isn't running, remind the user to start it with `bash scripts/dev.sh` or `uvicorn app.main:app --reload` from the `backend/` directory.
