import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeYoutubeCookie } from "./cookie";

const HEADER =
  "SID=abc; HSID=def; SSID=ghi; SAPISID=jkl; __Secure-1PSID=mno";

test("acepta la cabecera cookie copiada del navegador", () => {
  const parsed = normalizeYoutubeCookie(HEADER);

  assert.equal(parsed.source, "header");
  assert.deepEqual(parsed.missing, []);
  assert.ok(parsed.names.includes("SID"));
  assert.ok(parsed.names.includes("__Secure-1PSID"));
  assert.match(parsed.cookie, /SID=abc/);
});

test("tolera el prefijo «Cookie:» y espacios", () => {
  const parsed = normalizeYoutubeCookie(`  Cookie:  ${HEADER}  `);

  assert.equal(parsed.source, "header");
  assert.equal(parsed.names.length, 5);
  assert.ok(!parsed.cookie.startsWith("Cookie"));
});

test("conserva valores con signos igual", () => {
  const parsed = normalizeYoutubeCookie(
    "SID=abc=def; HSID=x; SSID=y; SAPISID=z",
  );

  assert.match(parsed.cookie, /SID=abc=def/);
});

test("convierte un cookies.txt de Netscape en cabecera", () => {
  const netscape = [
    "# Netscape HTTP Cookie File",
    ".youtube.com\tTRUE\t/\tTRUE\t0\tSID\tabc",
    ".youtube.com\tTRUE\t/\tTRUE\t0\tHSID\tdef",
    ".youtube.com\tTRUE\t/\tTRUE\t0\t__Secure-1PSID\tghi",
    ".google.com\tTRUE\t/\tTRUE\t0\tSAPISID\tjkl",
    ".google.com\tTRUE\t/\tTRUE\t0\tNID\tno-es-de-sesion",
    ".example.com\tTRUE\t/\tTRUE\t0\tSID\tajena",
  ].join("\n");

  const parsed = normalizeYoutubeCookie(netscape);

  assert.equal(parsed.source, "netscape");
  assert.deepEqual(parsed.missing, []);
  assert.ok(parsed.names.includes("SAPISID"));
  assert.ok(!parsed.names.includes("NID"));
  assert.ok(!parsed.cookie.includes("ajena"));
  assert.match(parsed.cookie, /SID=abc/);
});

test("entiende las líneas #HttpOnly_ de Netscape", () => {
  const netscape = [
    "# Netscape HTTP Cookie File",
    "#HttpOnly_.youtube.com\tTRUE\t/\tTRUE\t0\tSID\tabc",
    "#HttpOnly_.youtube.com\tTRUE\t/\tTRUE\t0\tHSID\tdef",
    ".youtube.com\tTRUE\t/\tTRUE\t0\t__Secure-1PSID\tghi",
  ].join("\n");

  const parsed = normalizeYoutubeCookie(netscape);

  assert.deepEqual(parsed.missing, []);
  assert.ok(parsed.names.includes("SID"));
});

test("rechaza una cookie sin sesión de YouTube", () => {
  const parsed = normalizeYoutubeCookie(
    "# Netscape HTTP Cookie File\n.example.com\tTRUE\t/\tTRUE\t0\tSID\tabc",
  );

  assert.equal(parsed.cookie, "");
  assert.deepEqual(parsed.missing, ["ninguna cookie de youtube.com"]);
});

test("avisa si falta una cookie secundaria de sesión", () => {
  const parsed = normalizeYoutubeCookie("SID=abc; __Secure-1PSID=def");

  assert.deepEqual(parsed.missing, []);
  assert.equal(parsed.warnings.length, 1);
  assert.match(parsed.warnings[0], /HSID, SSID o SAPISID/);
});

test("no duplica nombres de cookie", () => {
  const parsed = normalizeYoutubeCookie(
    "SID=primera; SID=segunda; HSID=x; SSID=y; SAPISID=z",
  );

  assert.equal(parsed.names.filter((name) => name === "SID").length, 1);
  assert.match(parsed.cookie, /SID=segunda/);
});
