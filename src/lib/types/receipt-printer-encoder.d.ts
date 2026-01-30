declare module "@point-of-sale/receipt-printer-encoder" {
  type Alignment = "left" | "center" | "right";
  type ImageAlgorithm = "atkinson" | "threshold" | "bayer" | "floydsteinberg";

  class ReceiptPrinterEncoder {
    constructor();
    initialize(): this;
    align(alignment: Alignment): this;
    image(
      image: HTMLImageElement,
      width: number,
      height: number,
      algorithm?: ImageAlgorithm,
    ): this;
    line(text: string): this;
    newline(count?: number): this;
    encode(): Uint8Array;
  }

  export default ReceiptPrinterEncoder;
}
