# Timesheet
Generate simple timesheet based on google location history.

## Usage
- go to your [google location history](https://www.google.com.au/maps/timeline) and download it in `kml` format.
- clone the repo to your machine
- have node installed
- make a copy of `default-config.yaml` place it in `~/.timesheet.yaml`
- edit `~/.timesheet.yaml to include your coords and place name
- `npm install` to get dependencies
- `node index.js convert </path/to/LocationHistory.kml>`

## Example Output

```
03.06.2013 08:52 | 03.06.2013 18:10 | WORK | 09:18
31.05.2013 09:18 | 31.05.2013 17:34 | WORK | 08:16
30.05.2013 09:07 | 30.05.2013 17:46 | WORK | 08:39
29.05.2013 09:16 | 29.05.2013 22:39 | WORK | 13:22
28.05.2013 09:17 | 28.05.2013 17:45 | WORK | 08:28
```

You can then copy the output into sublime, replace each of `|` with the tab character, then copy that into Google Sheets.
