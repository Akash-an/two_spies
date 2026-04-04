export var ClientMessageType;
(function (ClientMessageType) {
    ClientMessageType["SET_PLAYER_NAME"] = "SET_PLAYER_NAME";
    ClientMessageType["CREATE_MATCH"] = "CREATE_MATCH";
    ClientMessageType["JOIN_MATCH"] = "JOIN_MATCH";
})(ClientMessageType || (ClientMessageType = {}));
export var ServerMessageType;
(function (ServerMessageType) {
    ServerMessageType["MATCH_CREATED"] = "MATCH_CREATED";
    ServerMessageType["MATCH_START"] = "MATCH_START";
    ServerMessageType["WAITING_FOR_OPPONENT"] = "WAITING_FOR_OPPONENT";
    ServerMessageType["ERROR"] = "ERROR";
})(ServerMessageType || (ServerMessageType = {}));
