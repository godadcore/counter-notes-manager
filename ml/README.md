# Counter Notes research

A local research service for one YouTube channel. It does not open the database. It sends SQL to the Node API. It does not upload video, scrape Google or YouTube pages, or invent a number.

## What a run does

1. Reads seed keywords and lookalike channel links from config. You paste those once on Setup.
2. If `YOUTUBE_API_KEY` is set, it reads each lookalike channel with channels.list, then that channel's uploads playlist, then the last 30 videos. It does not use search. Each of those calls costs about 1 quota unit. The job stops when the next call would enter the last 200 units of the 10,000 unit daily limit.
3. The big-winner score is views divided by the median of that channel's sample. The dossier shows the sample size. Titles are turned into TF-IDF vectors and clustered with scikit-learn. A logistic regression predicts big winners (score at least 2) and reports cross-validated accuracy plus feature weights. Under 30 videos, the report says the sample is small. Sentence-transformers is optional and off unless `COUNTER_NOTES_EMBEDDINGS=1`.
4. It resolves the brand to one Wikidata business or brand, then reads that Wikipedia article, its cited pages, and the company site when robots.txt allows. SEC EDGAR runs only when the entity has a ticker or a listing. Private companies are skipped. GDELT waits at least 6 seconds between requests, backs off once on HTTP 429, caches a success for 24 hours, and does not retry in a loop. A number matches only when the figure, a year, and the claim words are near each other. One secondary page is Reported. Runtime and other production settings are not checked. The model never supplies a number.
5. Suggests Commons and optional Pexels images only when a license and an attribution are present.
6. Writes a dossier and the manager adds it to the video prompt.

## Sample size, metrics, limits

The checked sample in `tests/test_research.py` is a fixture, not a live crawl. One primary SEC snippet containing `$2` verifies that figure. One Wikipedia snippet does not. Two different sites do. A one-row training set returns no accuracy and the small-sample warning.

Live metrics appear only after cached videos exist. Expect nothing useful below 30 videos, and no cross-validation unless both ordinary videos and outliers are present.

## Install size

The default install is FastAPI, Uvicorn, and scikit-learn. On this laptop `ml/.venv` is 256 MB after `pip install -r requirements.txt`. It does not download a language model.

The optional file `requirements-embeddings.txt` adds sentence-transformers, which pulls PyTorch. That extra is about 1 GB or more and stays off. Install it only if you set `COUNTER_NOTES_EMBEDDINGS=1`.

```
.venv\Scripts\python -m pip install -r requirements-embeddings.txt
```

YouTube Data API default quota is 10,000 units per day. Five searches and their video lookups are about 505 units. The reserve keeps the job from spending the last 200. Wikipedia, Wikidata, SEC, GDELT, Commons, and the World Bank API are free and need no key. FRED and Pexels are skipped until a free key is present. No API here requires a credit card. YouTube, FRED, and Pexels do require a free account and a key.

This service does not call the YouTube upload API, the Google search page, or a paid model.

## Reproduce

From the `ml` folder:

```
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m unittest discover -s tests -t .
.venv\Scripts\python -m uvicorn app:app --port 8765
```

The tests do not need a key or a network connection. The API starts a daily pass while the process is running. That pass researches the next 4 topics to post and stops before the YouTube quota guard. Today has **Run research now** for the video you have open. Leave the laptop on for the daily pass. The log is the `research_log` table.

Optional environment variables, all free: `YOUTUBE_API_KEY`, `FRED_API_KEY`, `PEXELS_API_KEY`. None of them asks for a credit card.

## One real topic

1. On Setup, save one seed keyword and, if you have them, lookalike channel links.
2. Put `YOUTUBE_API_KEY=your-free-key` in the project `.env`. The file is gitignored.
3. From `ml`, start `.venv\Scripts\python -m uvicorn app:app --port 8765`. Starting it also begins the daily pass, which researches every saved topic once. Leave it running only when you want that pass.
4. On Today, choose one video and press **Run research now**. That call researches only the video you have open.

The dossier then lists what each source returned, including the entity it chose and how many news rows it dropped. A number becomes Verified (primary) when the figure sits next to the claim words on a primary page, or Verified (two independent sources) when two different publishers do that. A Wikipedia mirror or a copied paragraph does not count as the second publisher. One secondary page is labeled Reported. Anything else stays Needs check.
