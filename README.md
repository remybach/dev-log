# &lt;dev-log /&gt;

A server with which I keep a development log. Anything from what's tripped me up, blocked me, or simply something I've learned.

The UI side of it is... let's go with functional.

## An API and a web server.

It's built with Hapi and attempted to be done in a RESTful way. The same urls can be called with an `Accept: application/json` header for API functionality, and without for normal website functionality (no need for all that `/api/logs` or `/logs.json` business).

The following endpoints are currently available:

| Endpoint            | Method   | Details                                                             |                  
|---------------------|----------|---------------------------------------------------------------------|
| `/`                 |          | Just a landing page with the added ability to post a new log entry. |
| `/log`              | PUT/POST | Add a new log entry by sending a `msg` parameter                    |
| `/log/{id}`         | DELETE   | Delete the given log entry.                                         |
| `/logs`             | GET      | Retrieve a list of all the current logs.                            |
| `/search?q={query}` | POST     | Search the logs for `{query}`                                       |

### Alfred

The very reason I wanted this to be an API as well is so that I could have an Alfred workflow that let me quickly log these entries. I do this with the following simple cURL request:

```
curl -X PUT -H "Content-Type: application/json" -d "{ 'msg': '{query}' }" 127.0.0.1:1236/log
```

## Setting up shop

1. Clone/download the repo.
2. Run `npm install`.
3. Make a copy of `config.js.example` and rename it to `config.js`.
4. Tweak the settings in `config.js` to suit your needs (most notably `dbUrl`).
5. Fire up the server with `npm start`.
6. Open <http://localhost:1236/> to start adding logs.

### What about Mongo DB?

You need to either roll your own, or I find that a free <mlabs.com> account is more than enough for the very occasional log/lookup/search/whatever.

## Current state of things

At this stage, I'm still learning Hapi and Mongo properly so everything is still very much subject to change. On the off chance anyone actually sees this in its current state... I apologize :P

### TODO

+ Delete logs (from the UI).
+ Edit logs.
+ Try to get a better design happening.