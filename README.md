# meeseeks-two
meeseeks is so good someone made meeseeks 2.

## Attribution
Massive thanks to [GDjkhp](https://github.com/GDjkhp)'s [meeseeks-leaderboard-api](https://github.com/GDjkhp/meeseeks-leaderboard-api), as this project wouldn't exist without it.

## Build Instructions
### Prerequisites
1. [Git](https://git-scm.com/). (why are you even on github without git)
2. [Node.js](https://nodejs.org/en/download). (and also npm but that should comes with node)
3. A [Discord](https://discord.com/developers/applications/) bot token.

### Build
1. Install dependencies:
```bash
npm install
```
2. Build:
```bash
npm run build
```

### After Building
1. Create a file named ".env" and put it in public/ (or whatever folder the main.js file is in but it should be public/ by default). the file should look something like this:
```txt
DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN
```
2. To start the build:
```bash
npm run start
```
3. Alternatively, run without building:
```bash
npm run dev
```

## License
This project is licensed under the [GNU General Public License 3.0](LICENSE).