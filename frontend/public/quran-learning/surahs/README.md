Place one JSON file per Surah in this folder.

File naming:

- 1.json
- 2.json
- ...
- 114.json

Each Surah file should match this schema:
{
"surahNumber": 1,
"arabicName": "...",
"englishName": "...",
"transliterationName": "...",
"ayahCount": 7,
"ayahs": [
{
"ayahNumber": 1,
"arabicText": "...",
"beginnerPronunciation": "...",
"fullTranslation": "...",
"words": [
{
"position": 1,
"arabic": "...",
"pronunciation": "...",
"meaning": "..."
}
]
}
]
}

Do not generate values manually in app code.
Load only verified datasets and map words by surahNumber + ayahNumber + position.
