# nodecg-tiltify

> TODO: Improve stub readme

Rewrite of [daniellockard/nodecg-tiltify](https://github.com/daniellockard/nodecg-tiltify) using TypeScript, providing types for Tiltify's APIs.

This follows the original replicant schemas, with only three changes:
- `total` is now an amount value, providing an object of currency and value instead of a single value number
- `mark-dono-as-read/shown` has been replaced with more flexible `set-donation-read/shown` where you pass a Boolean as well.
- A `donors` replicant is also provided following Tiltify's API for this.

# Installation

Follow [setup from the original repo](https://github.com/daniellockard/nodecg-tiltify#setup)
