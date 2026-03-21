# WASD 2025 Livestream Graphics

The main repository for the graphics for WASD 2024. This has been completely rewritten to use Typescript, React and NodeCG 2.

## Installation

0. Install Node 20.20 (LTS) - [link for Windows](https://nodejs.org/dist/v20.20.0/node-v20.20.0-x64.msi)

1. Clone this bundle, include submodules (for nodecg-speedcontrol)
```sh
git clone --recurse-submodules https://github.com/ericthelemur/wasd
```

If you've cloned without submodules run `git submodule update --remote --init` instead.

2. Install dependencies for nodecg-speedcontrol
```sh
cd bundles/nodecg-speedcontrol
npm install --production
cd ../..
```
3. Install dependencies for this repository (in project root)
```sh
npm install
```

4. Set up config files: 
    1. Copy files in `default-cfg` to `cfg`
    2. Update year in `wasd.js`
    2. In `nodecg.js`, replace `<SOME PASSWORD>` with a random password for basic login
    3. In `nodecg-speedcontrol.json`, set `defaultMarathon` and `defaultSchedule` for the correct Oengus marathon
    4. See below for setting up Twitch with `nodecg-speedcontrol` (not essential for testing)
    5. Optionally, see below for setting up Discord for Login

5. Build extension, dashboard & graphics:
```sh
npm run build
# npm run build -- --dashboard builds the dashboard only
# Same for --graphics, --extension and --shared
# --clean clears the target directories first
# npm run watch rebuilds the browser files (dashboard & graphics)
# See scripts/build.mjs for all arguments
```

6. Run NodeCG:
```sh
npm run start
# npm run nodemon uses nodemon to watch extension files and restart NodeCG & rebuild when a change is detected
```

7. Setup integrations as the following section
8. Load the suitable OBS preset - update each NodeCG browser source with a new URL including the new `key` parameter

# Integrations

Each integration will be split into:
- **Setup**: To be done before any use, but can be shared over multiple installations - usually usable for dev & prod
- **Config**: Configuration in `cfg` or elsewhere that must be done before starting NodeCG (restart if changed)
- **Use**: Configuration within NodeCG dashboards or elsewhere to be done while NodeCG is running to link an individual instance

Those marked with * are necessary for full use, those marked with ** are essential to basic use (e.g. dev)

## Discord for Login
**Initial & Config**
1. See https://www.nodecg.dev/docs/security#discord-auth

## Twitch
**Setup**
Create application (used for login OAuth)
1. Go to https://dev.twitch.tv
2. Login with account (personal or warwickspeedrun)
3. Go to Console > Applications > Register Your Application
    1. OAuth Redirect URLs: `https://localhost:9090/nodecg-speedcontrol/twitchauth`. This should be the same as `twitch.redirectURI` in `cfg/nodecg-speedcontrol.json`
    2. Type: Confidential. Category: Application Integration

**Config**
1. Copy Client ID & Secret into `cfg/nodecg-speedcontrol.json` as `<TWITCH CLIENT ID>` and `<TWITCH CLIENT SECRET>`

**Use**
1. Log in to streaming account (personal if testing, warwickspeedrun if prod)
2. Click **Connect with Twitch** in **Twitch Control** panel
3. Authorize with logged-in Twitch account

- This will allow NodeCG to automatically update the stream title & game
- It will also allow NodeCG to trigger ad breaks (if affilate account, which warwickspeedrun is). A 3 min ad break disables pre-roll ads for 1 hr (1:30 for 30 mins)

# Oengus*
**Setup**
1. Create the Oengus marathon
2. Go through the usual process, publish a schedule
3. For each run, in schedule management, add custom data `{ "scene": "RUN-1", "layout": "16-9" }`
    - Where `scene` is the scene - `RUN-1`, `RUN-2` or `RUN-RACE` - alternate `RUN-1` and `RUN-2` in general
    - Where `layout` is the aspect ratio of the game, dynamically changes the overlay e.g. `16-9` or `4-3`

**Config**
1. Set `defaultMarathon` and `defaultSchedule` in `cfg/nodecg-speedcontrol.json`

**Use**
1. In tab `Run Modifications`, dashboard `Oengus Schedule Import`, change the marathon and schedule, if not the defaults
2. Click **Import Schedule Data** and wait for it to import all runs & runners
3. This will separately trigger the people manager to refetch socials for all runners from Oengus (speedcontrol only pulls Twitch & YT)

# Tiltify*
**Setup**
1. Create your Tiltify campaign, adding milestones, rewards, incentives, etc.
2. On Tiltify, on any account, go to https://app.tiltify.com/developers
3. Click **Create application**, fill in fields -- redirect URI is unecessary, put https://warwickspeed.run or something, we aren't using it
4. Copy the **Client ID** and **Client Secret**

**Use**
1. In tab **Connection Settings**, dashboard **Tiltify Control**, copy Client ID & Client Secret for the Tiltify application
    - Note: for testing, this may be any campaign, not necessarily a WASD one. It may be beneficial to find one that is active right now
2. Open the campaign in the Tiltify manager, and go to **Setup** > **Information** and copy the campaign ID from there
    - Alternatively, just take it from the URL of the campaign's webpage (should be a UUID)
3. Put this into **Campaign ID** and click **Connect**
4. Check the campaign name is correct, if not, you have the wrong Campaign ID

# Tiltify Webhook
- Bit of a pain for only a slight gain in donation response times - not really worth it

**Setup**
1. Expose NodeCG with a tunnel - note: this must be HTTPS and make sure NodeCG has decent security enabled as this will expose the whole thing
2. Within Tiltify's developer settings for the application, go to the **Webhooks** tab
3. Click **Add webhook**, setting the **Endpoint URL** to `https://<tunnel url>/tiltify/webhook`

**Use**
1. In tab **Connection Settings**, dashboard **Tiltify Control**, enable **Use Webhook**
2. Copy the **Webhook Signing ID** from the webhook's settings page
3. Copy the **Webhook ID** from the webhook's settings page's URL (idk if there is a better place for this)
4. If you want to try automatically tunneling with `localtunnel` set a **Requested Subdomain** - ensure you have NodeCG security configured

# Discord

# Foobar

# Mixer (XR18)

# OBS