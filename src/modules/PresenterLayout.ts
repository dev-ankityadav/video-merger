export default class PresenterLayout implements VideoLayout {
  getBoxes(n: number, size: Size): VideoBox[] {
    if (n === 1) {
      return [{
        w: size.w,
        h: size.h,
        x: 0,
        y: 0
      }]
    }
    const out = [];
    let cols, rows;

    // Determine the layout based on the number of boxes
    if (n === 2) {
      cols = 1;
      rows = 2;
    } else if (n <= 4) {
      cols = 2;
      rows = 2;
    } else if (n <= 6) {
      cols = 2;
      rows = 3;
    } else if (n <= 9) {
      cols = 3;
      rows = 3;
    } else {
      cols = Math.ceil(Math.sqrt(n * (16 / 9)));
      rows = Math.ceil(n / cols);
    }

    // Calculate box dimensions to maintain a 16:9 aspect ratio
    let boxWidth = size.w / cols;
    let boxHeight = boxWidth / (16 / 9);

    // Adjust height if it exceeds container height
    if (boxHeight * rows > size.h) {
      boxHeight = size.h / rows;
      boxWidth = boxHeight * (16 / 9);
    }

    // Calculate horizontal offset to center the boxes
    const offsetX = (size.w - boxWidth * cols) / 2;

    // Calculate positions for each box
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;

      out.push({
        w: boxWidth,
        h: boxHeight,
        x: offsetX + col * boxWidth,
        y: row * boxHeight
      });
    }

    return out;
  }

}