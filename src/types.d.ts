declare module 'redis-parser' {
    type ParserOpts = {
        returnReply:(string) => void;
        returnError:(err) => void;
        returnFatalError:(err) => void;
    }

    export = Parser

    declare class Parser {
        constructor(opts:ParserOpts);
        execute(buffer: Buffer);
    }
}