import net from 'net'
import Parser from 'redis-parser'

interface Logger  {
    info(...data: any[]): void;
    log(...data: any[]): void;    
    error(...data: any[]): void;
    warn(...data: any[]): void;
}

/**
 * establishes an open socket to the Tile38 server for live geofences
 */
export class LiveGeofence {

    private debug : boolean
    private logger : Logger
    private socket! : net.Socket
    private onCloseCb!: (has_error:boolean) => boolean;

    constructor(debug = false, logger = console) {
        this.debug = debug
        this.logger = logger
    }

    /**
     * opens a socket to the server, submits a command, then continuously processes data that is returned
     * from the Tile38 server
     * @param host
     * @param port
     * @param password
     * @param command Command string to send to Tile38
     * @param callback callback method with parameters (err, results)
     */
    open(host: string, port: number, password: string, command: string, callback: (err:any, results:any) => void) {
        const socket = new net.Socket();
        this.socket = socket;
        socket.connect(port, host, () => {
            if (password) {
                // authenticate if necessary
                socket.write(`AUTH ${password}\r\n`);
            }
            socket.write(command + "\r\n");
        });

        let self = this;
        socket.on('close', () => {
            if (this.onCloseCb) this.onCloseCb(false);
        });

        const parser = new Parser({
            returnReply: (reply: string) => {
                if (self.debug) self.logger.log(reply);
                if (reply == 'OK') return; // we're not invoking a callback for the 'OK' response that comes first

                let response = reply;
                let f = reply.charAt(0);
                if (f == '{' || f == '[') {
                    // this smells like json, so try to parse it
                    try {
                        response = JSON.parse(reply);
                    } catch (err) {
                        self.logger.warn("Unable to parse server response: " + reply);
                        // we'll return the reply as-is.
                    }
                }
                callback(null, response);
            },
            returnError: (err: string) => {
                self.logger.error('live socket error: ' + err);
                callback(err, null);
            },
            returnFatalError: (err: string) => {
                self.logger.error('fatal live socket error: ' + err);
                self.socket.destroy();
                callback(err, null);
            }
        });

        socket.on('data', (buffer: Buffer) => {
            parser.execute(buffer);
        });
       return this;
    }

    // allows clients to register an 'on closed' handler to be notified if the socket unexpectedly gets closed
    onClose(callback: (boolean: any) => boolean) {
        this.onCloseCb = callback;
    }

    // Forces the geofence to be closed
    close() {
        if (this.socket) this.socket.destroy();
    }
}

