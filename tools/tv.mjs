// usage: node tools/tv.mjs <port> eval "<js>" | key <keyCode>
import { connect } from './cdp.mjs';

const [port, cmd, arg] = process.argv.slice(2);
const tv = await connect(port);
if (cmd === 'eval') console.log(await tv.evaluate(arg));
else if (cmd === 'key') console.log('key', await tv.key(Number(arg)));
tv.close();
