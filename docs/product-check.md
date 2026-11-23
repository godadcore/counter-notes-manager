# Product check

Goal, in your words: a private website for phone and desktop that is your YouTube manager. It researches online by itself (YouTube, news, free sources). It studies lookalike channels and why they win. It finds real facts with proof. It builds one big prompt per video with the facts, links, and media. You only copy the prompt, make the video, and post. It tells you each day what to post and learns from your results.

This list is honest about what the app does today. A green layout is not the same as a finished product.

| Idea | Status | Where it lives |
| --- | --- | --- |
| A private website you can use on a phone and on a desktop | DONE | The app in this folder. Phone uses the top bar and drawer. Desktop uses the sidebar from 900px. Data is in `data/counter-notes.sqlite`. Every address, including this computer, needs `COUNTER_NOTES_PASSCODE`. |
| It researches online by itself (YouTube, news, free sources) | PARTIAL | `ml/` can ask the YouTube Data API when `YOUTUBE_API_KEY` is set, plus Wikipedia, Wikidata, SEC when a ticker exists, GDELT, and Commons. Optional FRED and Pexels. Today has **Run research**, which calls that service. Nothing runs unless the Python service is started and the laptop stays on. It does not browse YouTube or Google pages on its own. |
| It studies lookalike channels and why they win | PARTIAL | Setup stores seed keywords and channel links. The Python pipeline can score views against a channel median, cluster titles, and flag a big winner. The notes text can include those patterns. There is no screen that only explains why a lookalike channel wins. |
| It finds real facts with proof | PARTIAL | Proof page and the check list on Today. The Python check is meant to accept a number only when a retrieved sentence contains both the figure and words from the claim. The research test that encodes the simple rule currently fails, so this is not solid yet. The model is not supposed to invent numbers. |
| One big prompt per video, with the facts, links, and media | PARTIAL | Today builds four prompts: Research, Video, Thumbnail, and Fact check. The video prompt includes the research notes when they exist. Media is included only when a license and a credit are present. The Video button stays off while a number is still not checked. |
| You only copy the prompt, make the video, and post | PARTIAL | The copy buttons put the prompt on the clipboard. There is no YouTube upload. Posting is something you do yourself. Plan has a checklist. Today has **Mark used**. |
| It tells you each day what to post | PARTIAL | Plan is 30 days. Today opens on the next post that is not checked off, with that day's badge. **Another brand** is last in the list. |
| It learns from your results | PARTIAL | Weekly review, on Plan, stores click rate, impressions, average view time, and the retention curve. It compares each video with this channel's own middle value and can suggest a title. It does not retrain the lookalike model, and it does not rewrite the next prompt by itself. |

Not in the product: uploading to YouTube, a paid model, Cloudflare, and research that keeps going with the laptop closed.
