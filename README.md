# WASD 2025 Livestream Graphics

The main repository for the graphics for WASD 2024. This has been completely rewritten to use Typescript, React and NodeCG 2.

## Installation

1. Install NodeCG
```sh
# Install NodeCG CLI tools for ease of use
npm install -g nodecg-cli
# Install nodecg, default settings are fine, you may need npx nodecg setup
nodecg setup
```

2. Install Dependent Bundles
  - If installing for dev, omit `-b build --single-branch`, then `npm i` and `npm run build` in each
```sh
cd bundles
# speedcontrol needs npm deps installing
git clone -b build https://github.com/speedcontrol/nodecg-speedcontrol.git
cd nodecg-speedcontrol
npm install --production
cd ..
```

3. Install WASD Bundle
```sh
# Still in /bundles
git clone https://github.com/ericthelemur/wasd

cd wasd
npm i
npm run build
```

4. Setup config files
```sh
nodecg defaultconfig wasd
# Fill out nodecg-tiltify's config with Tiltify keys
# TODO: Default speedcontrol config
```

5. Run NodeCG
```sh
# In the /bundles/wasd
npm run start
```
