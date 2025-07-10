// Mock BroadcastChannel for Jest environment
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  postMessage(message: any) {
    // In tests, we can simulate immediate delivery
    if (this.onmessage) {
      const event = new MessageEvent("message", { data: message });
      setTimeout(() => this.onmessage?.(event), 0);
    }
  }

  addEventListener(type: string, listener: EventListener) {
    if (type === "message") {
      this.onmessage = listener as (event: MessageEvent) => void;
    } else if (type === "messageerror") {
      this.onmessageerror = listener as (event: MessageEvent) => void;
    }
  }

  removeEventListener(type: string, listener: EventListener) {
    if (type === "message") {
      this.onmessage = null;
    } else if (type === "messageerror") {
      this.onmessageerror = null;
    }
  }

  close() {
    // No-op in mock
  }
}

// Mock BroadcastChannel globally
global.BroadcastChannel = MockBroadcastChannel as any;

// Mock crypto.randomUUID if not available
if (typeof global.crypto === "undefined") {
  global.crypto = {
    randomUUID: () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        },
      );
    },
  } as any;
}

// Mock MessageEvent if not available
if (typeof global.MessageEvent === "undefined") {
  global.MessageEvent = class MessageEvent {
    data: any;
    type: string;

    constructor(type: string, eventInitDict?: { data?: any }) {
      this.type = type;
      this.data = eventInitDict?.data;
    }
  } as any;
}
