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
- **Setup**: To be done before any use, most can be shared over multiple installations - usually usable for dev & prod. This might include configuring in `cfg` (requires restarting if changed)
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
4. In **Overview > Application keys**, copy the **Client ID** and **Client Secret**

**Use**
1. In tab **Connection Settings**, dashboard **Tiltify Control**, copy Client ID & Client Secret for the Tiltify application
    - Note: for testing, this may be any campaign, not necessarily a WASD one. It may be beneficial to find one that is active right now
2. Open the campaign in the Tiltify manager, and go to **Setup** > **Information** and copy the campaign ID from there
    - Alternatively, just take it from the URL of the campaign's webpage (should be a UUID)
3. Put this into **Campaign ID** and click **Connect**
4. Check the campaign name is correct, if not, you have the wrong Campaign ID

# Tiltify Webhook
- Bit of a pain for only a slight gain in donation response times - not really worth it
- Also tunnel is kinda jank (but useful for external)

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
**Setup**
You can follow **Step 1** from [Discord docs](https://docs.discord.com/developers/quick-start/getting-started#step-1-creating-an-app) if this gets out of date, make sure to add the necessary permissions below.

1. Create the application/bot
    1. Go to https://discord.com/developers/applications
    2. Click **New Application**, give it a name, Confirm
2. Go to the **Bot** tab
    1. Click **Reset Token** and copy the value (save it for later!)
3. Add bot to server
    1. Go back to **Installation**
    2. Disable **User Install** (would do nothing anyway)
    3. Make sure **Install Link** is on **Discord Provided Link** (should be)
    4. Under **Default Install Settings**, add **bot**
    5. Add server permissions (note, these can be added later in the usual Roles manager):
        - **Create Events** & **Manage Events**, so it can sync events
        - **Send Messages** for the schedule message channel
    6. Copy the invite link in **Invite Link**, paste into your browser
    7. This should open in Discord. Select the relevant server (probably a test one) and confirm the permissions

**Use**
1. Copy **Application ID** from the **General Information** tab into **Discord App ID**
2. Copy **Token** from the **Bot** tab into **Discord Bot Token**
    - You should have saved this earlier
    - If not used anywhere else, you can reset if you've lost it
3. Copy Server IDs:
    1. Open your general Discord Settings, go to **Advanced**
    2. Enable **Developer Mode** (this doesn't do much, don't worry)
    3. Right-click the server you invited the bot to and **Copy Server ID**, paste into **Discord Server**
    4. Repeat for the channel ID into **Schedule Channel** if wanting schedule messages 
4. In the main NodeCG tab, enable **Start & End Events** in **Discord Control**
5. Click **Update Discord Events** to create events, further clicks will update the existing events if e.g. times change
    - If you need to re-create a single event, go to **ZZZ - DEV** andn

# Discord for Login
This requires the setup from above (adding bot to server), but does not require using Discord in the other way
**Setup**
1. Follow the **Setup** steps for **Discord**
2. Go to the **OAuth2** tab
3. Copy the **Client Secret** - note this is different from the bot token used above
4. In `cfg/nodecg.js`, under `login.discord`:
    1. Make sure `enabled` is `true`
    2. **`clientID`** is **Client ID** in the **OAuth2** tab - this is the same as above
    3. **`clientSecret`** is **Client Secret** in the **OAuth2** tab (copied previously)
    4. **`guildBotToken`** is the bot token from above step
    5. **`allowedRoleIDs`** is the role ID(s) of organizer/helper roles you want to log in to NodeCG (minimal tbh). 
        - Copy this like server/channel IDs, but clicking on a role in someone's profile

**Use**  
None

# Foobar (music)
Bit of a weird music player, but based on UKSG's use of it

**Setup**
1. Download [foobar2000](https://www.foobar2000.org/windows) - latest stable should do
2. Run installer
    - Personally I have installed a portable installation under the NodeCG folder `/foobar2000`, so it is portable with the setup, but up to you
    - Default options are fine otherwise
2. Run foobar2000 and configure layout - up to you, but I usually use **Visualisation + Cover Art + Tabs** and **Separate Album & Artist Columns**
    - Then usually drag the Spectrogram to zero height
3. Add the [beefweb](https://www.foobar2000.org/components/view/foo_beefweb) extension
    1. Click download on the linked page
    2. Open **File > Preferences > Components > Install ...** and find the downloaded .component file
    3. Click **OK** and let foobar restart to apply
    4. Reopen **Preferences**, go to **Tools > Beefweb Remote Control**, tick **Require authentication**
    5. Fill in username & password, and take note for later
    6. Visit http://localhost:8880 (port configurable) to check it is working (this page is the intentional use of this plugin)
3. Download music (can be done later or in parallel)
    1. The previous playlist is [on Spotify](https://open.spotify.com/playlist/6TmTYOvctp1N3lWDE6cme3) and is all from GameChops
    2. I will say download the tracks from elsewhere (as provided by GameChops), but various methods to download from Spotify exist
    3. Place this in a known directory, like `/foobar2000/music` and go **Library > Configure > + Folder** and find this location

**Use**
1. From **Tools > Beefweb Remote Control** copy **User** and **Password**, into **Connection Settings > Music Control** **Foobar Username** and **Foobar Password**

# Mixer (XR18)
**Setup**
1. Download **X-AIR EDIT PC** and **X18 USB Audio Driver** from https://www.behringer.com/downloads.html
    - Check you download one with Model=XR18 (yes the driver name is X18, but make sure you get the XR18 model)
    - You can search for the name, or select Product=XR18
    - As of 2026, the direct links are: [X Air EDIT PC v1.8.1](https://cdn.mediavalet.com/aunsw/musictribe/XJFMsT8f5kSI5mNP3NQUzQ/nJHScxZuhUeJ1gRV081Z0w/Original/X-AIR-Edit_PC_1.8.1.zip) and [X18 USB Audio Driver v5.72.0](https://cdn.mediavalet.com/aunsw/musictribe/sPDVpULa20Wn3mcJ9REDYw/vjXY1j0ERkaPz8ML2pMmTQ/Original/BEHRINGER_X18_v5.72.0_setup.zip)
2. Unzip X Air Edit to somewhere accesssible (Desktop perhaps), it isn't an installer
3. Unzip and run the driver setup. You may need to restart the PC to get this to work. You can verify this by checking if you have four stereo inputs and four stereo outputs labelled Behringer IN/OUT #-#.
4. Connect the mixer by ethernet to the PC - this may be through a network switch or direct
    - Or run mixer mock (see below) for development/testing (not perfect, but works)
    - If this connection is not working, check the physical switch on the mixer for connection type
    - If still not working, switch to Wifi and connect to that. Also X-Air should be able to scan for the mixer

**Setup Mock**
1. Install Python >=3.10 - note, will break under 3.10 as the library functions differently
2. Install [python-osc](https://pypi.org/project/python-osc/) - `pip install python-osc`
    - This may be in a virtual environment or globally
3. Run `npm run mixer-mock` which will run `src\mixer\osc-sim\server.py`, mocking up a basic interface for the mixer
    - You can change the IP & port it is hosted on with `--ip` and `--port` args (port should always be 10024)
4. You are able to connect X-Air to this mock too, but some of the more advanced functions won't work (like loading the scene)

**Use**
1. In **Connection Settings > Mixer Control** Configure the **Mixer IP** (often `192.168.1.99`) & **Mixer Port** (always 10024)
    - If 

# OBS
** Setup**
1. If you have a particularly old OBS version, you will need to install the OBS Websocket plugin manually - but you really should update your OBS itself
2. In OBS, open **Tools > WebSocket Server Settings**, ensure **Enable Websocket server** is ticked and the password & port is configured. Click OK/Apply
3. Load the OBS preset and configure video sources
4. NodeCG browser overlay sources need the `key=.....` parameter updated to authenticate in your NodeCG, if you have authentication enabled.
    - Or by copying the full URLs for the relevant page in the **Graphics** tab
    - Do this by copying the key parameter from an open graphic to each in OBS
5. **Make sure that any video sources added are muted in OBS**
6. In OBS **Settings > Audio**, set **Mic/Auxilliary Audio** to **Berhinger OUT 1-2**, which is mapped to the Main LR out of of the mixer

**Use**
1. From **Tools > WebSocket Server Settings**, copy the password into **OBS Control > OBS Websocket Password**
2. Fill in **OBS Websocket URL**, this is likely to just be `localhost`/`127.0.0.1`, as NodeCG is normally running on the same PC as OBS
    - This can be a full URL, if you need a secure websocket (`wss://`) or a different port (`:1234`)
