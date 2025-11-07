// ask for name when page loads
let userName = prompt("Please give your mushroom a name:", "Mushroom");
if (!userName) userName = "Mushroom";

// show name on top of board
const userNameDisplayElement = document.getElementById('user-name-display');
if (userNameDisplayElement) {
  userNameDisplayElement.textContent = userName;
} else {
  console.error("can't find user-name element");
}

console.log('Garden app running...');
console.log('user:', userName);

// socket + globals
const socket = io();
let currentMushroomPixels = []; 
let padInstance;
let gardenInstance;

//image templates
let templates = [];
let currentTemplateIndex = 0;
const templateFilenames = [
  'FUNGI1.png', 'FUNGI2.png', 'FUNGI3.png',
  'FUNGI4.png', 'FUNGI5.png', 'FUNGI6.png'
];

//first p5 canvas: drawing board
//two canvas: sketchpad instance and garden instance
const sketchPad = (p) => {

  // load all images
  p.preload = () => {
    console.log('loading templates...');
    for (let i = 0; i < templateFilenames.length; i++) {
      templates[i] = p.loadImage(templateFilenames[i],
        () => console.log(`template ${i+1} ok`),
        () => console.error(`fail: ${templateFilenames[i]}`)
      );
    }
  };

  // clear and draw template
  p.clearBoard = () => {
    p.background(255); 

    if (templates[currentTemplateIndex]) {
      p.tint(255, 80); // transparency
      p.image(templates[currentTemplateIndex], 0, 0, p.width, p.height);
      p.noTint();
    } else {
      console.error(`template ${currentTemplateIndex} missing`);
    }
  };

  p.setup = () => {
    p.createCanvas(300, 300);
    p.clearBoard(); // first one
    console.log('pad ready');
  };

  // draw pixels on drag
  p.mouseDragged = () => {
    if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
      let brushColor = document.getElementById('brush-color').value;
      let brushSize = parseInt(document.getElementById('brush-size').value, 10);

      let pixelX = p.floor(p.mouseX / brushSize) * brushSize;
      let pixelY = p.floor(p.mouseY / brushSize) * brushSize;

      p.fill(brushColor);
      p.noStroke();
      p.rect(pixelX, pixelY, brushSize, brushSize);

      // save it
      currentMushroomPixels.push({
        x: pixelX,
        y: pixelY,
        color: brushColor,
        size: brushSize
      });
    }
  };
};

//second p5 canvas: transparent garden
const sketchGarden = (p) => {

  // draw one mushroom from data
  p.drawMushroom = (data) => {
    console.log('got new mushroom');
    const { drawing, gardenX, gardenY, name, drawingCenter } = data;

    // draw pixels (smaller)
    for (const pixel of drawing) {
      p.fill(pixel.color);
      p.noStroke();
      p.rect(
        gardenX + (pixel.x / 2),
        gardenY + (pixel.y / 2),
        pixel.size / 2,
        pixel.size / 2
      );
    }

    // draw name above
    p.fill(255);
    p.stroke(0);
    p.strokeWeight(1);
    p.textSize(14);
    p.textAlign(p.CENTER, p.BOTTOM);
    let scaledCenter = gardenX + (drawingCenter / 2);
    p.text(name, scaledCenter, gardenY - 5);
  };

  p.setup = () => {
    let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    p.clear();
    canvas.style('position', 'absolute');
    canvas.style('top', '0');
    canvas.style('left', '0');
    canvas.style('z-index', '-1');
    console.log('garden ready');
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
};

//two pads here, they are connect together, instance mode

//start
padInstance = new p5(sketchPad, 'drawing-board'); // used to draw the mashroom 
gardenInstance = new p5(sketchGarden, document.body); // used for every users to see the mushrooms

//submit button
const submitBtn = document.getElementById('submit-btn');
if (submitBtn) {
  submitBtn.onclick = () => {
    if (currentMushroomPixels.length === 0) {
      alert('nothing drawn');
      return;
    }

    // find center (roughly)
    let minX = Infinity;
    let maxX = -Infinity;
    for (const pixel of currentMushroomPixels) {
      minX = Math.min(minX, pixel.x);
      maxX = Math.max(maxX, pixel.x + pixel.size);
    }
    let drawingWidth = maxX - minX;
    let drawingCenter = minX + drawingWidth / 2;

    // random place (avoid control panel), aslo make sure the mushroom won't appear outside the website
    const controlPanel = document.getElementById('control-panel');
    let minY = 350;
    if (controlPanel) {
      minY = controlPanel.getBoundingClientRect().bottom + 40;
    }

    let randomX = Math.random() * (window.innerWidth - 300);
    let randomY = Math.random() * (window.innerHeight - 200);
    randomY = Math.max(randomY, minY);

    // send data to socket io
    let dataToSend = {
      drawing: currentMushroomPixels,
      gardenX: randomX,
      gardenY: randomY,
      name: userName,
      drawingCenter: drawingCenter
    };

    socket.emit('data', dataToSend);
    console.log('sent mushroom', dataToSend);

    // reset board
    currentMushroomPixels = [];
    padInstance.clearBoard();
  };
} else {
  console.error('no #submit-btn');
}

//receive mushrooms from others
socket.on('data-back', (data) => {
  gardenInstance.drawMushroom(data);
});

//template buttons
//change from fungi1 - fungi6
const prevBtn = document.getElementById('prev-template-btn');
const nextBtn = document.getElementById('next-template-btn');

if (prevBtn && nextBtn) {
  prevBtn.onclick = () => {
    currentTemplateIndex--;
    if (currentTemplateIndex < 0) currentTemplateIndex = templates.length - 1;
    padInstance.clearBoard();
    console.log('template:', currentTemplateIndex + 1);
  };

  nextBtn.onclick = () => {
    currentTemplateIndex++;
    if (currentTemplateIndex >= templates.length) currentTemplateIndex = 0;
    padInstance.clearBoard();
    console.log('template:', currentTemplateIndex + 1);
  };
} else {
  console.error('no template buttons');
}
