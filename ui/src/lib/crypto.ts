export async function sha256(data: string) {
  const binData = new TextEncoder().encode(data);
  const hashBuf = await window.crypto.subtle.digest("SHA-256", binData);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((n) => n.toString(16).padStart(2, "0")).join("");
}

export function tempPassword(length: number) {
  if (length <= 0) return "";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$&";
  let result = "";
  const randomArray = new Uint8Array(length);
  window.crypto.getRandomValues(randomArray);
  for (const num of randomArray) {
    result += alphabet[num % alphabet.length];
  }
  return result;
}
