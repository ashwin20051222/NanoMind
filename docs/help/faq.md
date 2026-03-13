# FAQ

## Is NanoMind only a chat app?

No. The repository is structured as an AI operating stack with a browser control UI, a Rust edge server, and ESP32 firmware.

## Does NanoMind already have real integrations?

No. The UI surfaces exist, but real Google and Meta API backends are not implemented yet.

## Does NanoMind have a real workflow scheduler?

No. Workflow creation and import exist in the browser, but backend execution and scheduling are not implemented.

## Does the UI still use demo data?

No. The UI was updated to stop seeding demo devices, demo integrations, and fake pairing states.

## Why does the frontend still show partial runtime behavior?

Because the frontend expects a richer WebSocket event model than the Rust server currently emits.

## Can the docs links become GitHub links later?

Yes. These docs already use relative repository paths. Once you upload the repo to GitHub, those become clickable repository links automatically.
