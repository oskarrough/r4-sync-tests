# @radio4000/sdk

JavaScript SDK for Radio4000. Works in browser and node.js.

See https://github.com/radio4000/sdk

## Usage

```js
import {sdk} from '@radio4000/sdk'

const {data: channels, error} = await sdk.channels.readChannels()
```

