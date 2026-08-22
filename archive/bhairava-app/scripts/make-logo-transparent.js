const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const src = path.resolve(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-HP-Downloads-Bhairava-App/assets/c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_aa1da6fb9b89b9f7a37165b433afd472_images_bhairava-logo-f44158b6-6505-4011-96de-2848ea933101.png",
);
const dest = path.resolve(__dirname, "../public/branding/bhairava-logo.png");
const tmp = path.resolve(__dirname, "../public/branding/bhairava-logo.tmp.png");

async function main() {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const threshold = 245;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0;
    }
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(tmp);

  await sharp(tmp).trim({ threshold: 10 }).png().toFile(dest);
  fs.unlinkSync(tmp);
  console.log("Wrote", dest);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
