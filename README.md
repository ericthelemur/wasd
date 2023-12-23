# react-test

react-test is a [NodeCG](http://github.com/nodecg/nodecg) bundle.
It works with NodeCG versions which satisfy this [semver](https://docs.npmjs.com/getting-started/semantic-versioning) range: `^2.0.0`
You will need to have an appropriate version of NodeCG installed to use it.


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

# Use build branch content
git clone -b build --single-branch https://github.com/ericthelemur/nodecg-tiltify 
git clone -b build --single-branch https://github.com/ericthelemur/nodecg-dono-control
git clone -b build --single-branch https://github.com/ericthelemur/nodecg-ticker-control   

# speedcontrol needs npm deps installing
git clone -b build https://github.com/speedcontrol/nodecg-speedcontrol.git
cd nodecg-speedcontrol
npm install --production
```

3. Install WASD Bundle
```sh
git clone https://github.com/ericthelemur/wasd

cd wasd
npm i
npm run build
```

4. Setup config files
```sh
nodecg defaultconfig nodecg-tiltify
# Fill out nodecg-tiltify's config with Tiltify keys
# TODO: Default speedcontrol config
```

5. Run NodeCG
```sh
# In the NodeCG root
nodecg start
```