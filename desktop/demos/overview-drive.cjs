// TST-0093's window run, in the box (TASK-0187): the same script as
// `npx electron . --drive scripts/overview-drive.cjs`, run where it takes no keyboard:
//   bash tools/scripts/walk-in-a-box.sh overview-drive
//   bash tools/scripts/walk-in-a-box.sh overview-drive --workspace ../your-trainer --name overview-drive-yt
module.exports = require('../scripts/overview-drive.cjs');
