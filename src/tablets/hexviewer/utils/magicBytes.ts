export interface MagicBytesResult {
  type: string;
  mime: string;
  extension: string;
}

interface Signature {
  magic: number[];
  offset: number;
  type: string;
  mime: string;
  extension: string;
}

// Ordered by specificity — longer/more-unique signatures first
const SIGNATURES: Signature[] = [
  { magic: [0x89, 0x48, 0x44, 0x46, 0x0D, 0x0A, 0x1A, 0x0A], offset: 0, type: "HDF5 Data File", mime: "application/x-hdf", extension: "h5" },
  { magic: [0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00], offset: 0, type: "XZ Archive", mime: "application/x-xz", extension: "xz" },
  { magic: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], offset: 0, type: "7-Zip Archive", mime: "application/x-7z-compressed", extension: "7z" },
  { magic: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07], offset: 0, type: "RAR Archive", mime: "application/x-rar-compressed", extension: "rar" },
  { magic: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65], offset: 0, type: "SQLite Database", mime: "application/x-sqlite3", extension: "db" },
  { magic: [0x89, 0x50, 0x4E, 0x47], offset: 0, type: "PNG Image", mime: "image/png", extension: "png" },
  { magic: [0x47, 0x49, 0x46, 0x38], offset: 0, type: "GIF Image", mime: "image/gif", extension: "gif" },
  { magic: [0x25, 0x50, 0x44, 0x46], offset: 0, type: "PDF Document", mime: "application/pdf", extension: "pdf" },
  { magic: [0x50, 0x4B, 0x05, 0x06], offset: 0, type: "ZIP Archive (empty)", mime: "application/zip", extension: "zip" },
  { magic: [0x50, 0x4B, 0x03, 0x04], offset: 0, type: "ZIP Archive", mime: "application/zip", extension: "zip" },
  { magic: [0x7F, 0x45, 0x4C, 0x46], offset: 0, type: "ELF Executable/Library", mime: "application/x-elf", extension: "elf" },
  { magic: [0xCA, 0xFE, 0xBA, 0xBE], offset: 0, type: "Java Class File", mime: "application/java-vm", extension: "class" },
  { magic: [0xFE, 0xED, 0xFA, 0xCF], offset: 0, type: "Mach-O 64-bit", mime: "application/x-mach-binary", extension: "macho" },
  { magic: [0xFE, 0xED, 0xFA, 0xCE], offset: 0, type: "Mach-O 32-bit", mime: "application/x-mach-binary", extension: "macho" },
  { magic: [0xCF, 0xFA, 0xED, 0xFE], offset: 0, type: "Mach-O 64-bit (LE)", mime: "application/x-mach-binary", extension: "macho" },
  { magic: [0xCE, 0xFA, 0xED, 0xFE], offset: 0, type: "Mach-O 32-bit (LE)", mime: "application/x-mach-binary", extension: "macho" },
  { magic: [0xD0, 0xCF, 0x11, 0xE0], offset: 0, type: "MS Office (OLE2)", mime: "application/msword", extension: "doc" },
  { magic: [0x38, 0x42, 0x50, 0x53], offset: 0, type: "Photoshop Document", mime: "image/vnd.adobe.photoshop", extension: "psd" },
  { magic: [0x1A, 0x45, 0xDF, 0xA3], offset: 0, type: "WebM/MKV Video", mime: "video/webm", extension: "webm" },
  { magic: [0x4F, 0x67, 0x67, 0x53], offset: 0, type: "OGG Audio/Video", mime: "application/ogg", extension: "ogg" },
  { magic: [0x49, 0x44, 0x33], offset: 0, type: "MP3 Audio (ID3)", mime: "audio/mpeg", extension: "mp3" },
  { magic: [0x42, 0x5A, 0x68], offset: 0, type: "BZip2 Archive", mime: "application/x-bzip2", extension: "bz2" },
  { magic: [0x1F, 0x8B], offset: 0, type: "GZip Archive", mime: "application/gzip", extension: "gz" },
  { magic: [0xFF, 0xD8, 0xFF], offset: 0, type: "JPEG Image", mime: "image/jpeg", extension: "jpg" },
  { magic: [0x4D, 0x5A], offset: 0, type: "PE Executable (Windows)", mime: "application/x-msdownload", extension: "exe" },
  { magic: [0xFF, 0xFB], offset: 0, type: "MP3 Audio", mime: "audio/mpeg", extension: "mp3" },
  { magic: [0x66, 0x74, 0x79, 0x70], offset: 4, type: "MP4 Video", mime: "video/mp4", extension: "mp4" },
  { magic: [0x57, 0x41, 0x56, 0x45], offset: 8, type: "WAV Audio", mime: "audio/wav", extension: "wav" },
];

export function detectMagicBytes(bytes: Uint8Array): MagicBytesResult | null {
  if (bytes.length < 2) return null;

  for (const sig of SIGNATURES) {
    if (bytes.length < sig.offset + sig.magic.length) continue;
    const match = sig.magic.every((b, i) => bytes[sig.offset + i] === b);
    if (match) {
      return { type: sig.type, mime: sig.mime, extension: sig.extension };
    }
  }

  return null;
}
