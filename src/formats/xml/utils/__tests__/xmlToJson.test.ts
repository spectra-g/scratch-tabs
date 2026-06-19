import { convertXmlToJson } from "../xmlToJson";

describe("convertXmlToJson", () => {
  it("preserves attributes and text with default keys", () => {
    const json = convertXmlToJson('<person id="1"><name>Ada</name></person>');

    expect(json).toEqual({
      person: {
        "@attributes": { id: "1" },
        name: { "#text": "Ada" },
      },
    });
  });

  it("uses arrays for repeated elements", () => {
    const json = convertXmlToJson("<root><item>a</item><item>b</item></root>");

    expect(json).toEqual({
      root: {
        item: [{ "#text": "a" }, { "#text": "b" }],
      },
    });
  });

  it("supports local-name namespace handling", () => {
    const json = convertXmlToJson(
      '<soap:Envelope xmlns:soap="urn:soap"><soap:Body><m:Ping xmlns:m="urn:m">ok</m:Ping></soap:Body></soap:Envelope>',
      { namespaceMode: "local" },
    );

    expect(json).toEqual({
      Envelope: {
        "@attributes": { soap: "urn:soap" },
        Body: {
          Ping: {
            "@attributes": { m: "urn:m" },
            "#text": "ok",
          },
        },
      },
    });
  });

  it("can include comments and cdata", () => {
    const json = convertXmlToJson("<root><!--note--><value><![CDATA[a < b]]></value></root>", {
      includeComments: true,
    });

    expect(json).toEqual({
      root: {
        "#comment": "note",
        value: { "#cdata": "a < b" },
      },
    });
  });
});
