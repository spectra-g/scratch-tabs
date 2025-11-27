import { copyTableToClipboard } from '../tableContextMenuUtils';
import { DOMSerializer } from 'prosemirror-model';

// Mock DOMSerializer
jest.mock('prosemirror-model', () => ({
  DOMSerializer: {
    fromSchema: jest.fn().mockReturnValue({
      serializeNode: jest.fn().mockReturnValue(document.createElement('div')),
    }),
  },
}));

describe('copyTableToClipboard', () => {
  let mockEditor: any;
  let mockExecCommand: jest.Mock;

  beforeEach(() => {
    // Mock document.execCommand
    mockExecCommand = jest.fn();
    document.execCommand = mockExecCommand;

    // Mock editor state
    mockEditor = {
      view: {
        state: {
          selection: {
            $from: {
              depth: 1,
              node: jest.fn().mockReturnValue({
                type: { name: 'table' },
                descendants: jest.fn(),
              }),
            },
          },
          schema: {},
        },
        focus: jest.fn(),
      },
      isActive: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should copy table content to clipboard', () => {
    copyTableToClipboard(mockEditor);

    expect(DOMSerializer.fromSchema).toHaveBeenCalled();
    expect(mockExecCommand).toHaveBeenCalledWith('copy');
    expect(mockEditor.view.focus).toHaveBeenCalled();
  });

  it('should not copy if no table is found', () => {
    // Mock no table found
    mockEditor.view.state.selection.$from.node = jest.fn().mockReturnValue({
      type: { name: 'paragraph' },
    });

    copyTableToClipboard(mockEditor);

    expect(DOMSerializer.fromSchema).not.toHaveBeenCalled();
    expect(mockExecCommand).not.toHaveBeenCalled();
  });
});