declare namespace ioBroker {
  type StateValue = string | number | boolean | null;

  interface State {
    val: StateValue;
    ack?: boolean;
    ts?: number;
    lc?: number;
    from?: string;
  }

  type ObjectType = "state" | "channel" | "device" | "folder" | "adapter" | "instance";

  interface Object {
    _id: string;
    type: string;
    common?: Record<string, unknown>;
    native?: Record<string, unknown>;
  }
}
