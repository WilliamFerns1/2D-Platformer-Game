// Target all the elements
const startBtn = document.getElementById("start-btn"); // button to start game
const canvas = document.getElementById("canvas"); // the main canvas element, as the game board
const startScreen = document.querySelector(".start-screen"); // the start screen box, giving information of the game, and a start button
const checkpointScreen = document.querySelector(".checkpoint-screen"); // checkpoint contianer, that will be showed when reaching a checkpoint
const checkpointMessage = document.querySelector(".checkpoint-screen > p"); // the checkpoint message container
const ctx = canvas.getContext("2d"); // get 2d context, to be able to render 2d objects on the screen
canvas.width = innerWidth; // set the canvas width to be full width (innerWidth is a shorthand for window.innerWidth)
canvas.height = innerHeight; // set the canvas height to be the full viewport height (innerHeight is a shorthand for window.innerHeight)
const gravity = 0.5; // set the gravity to 0.5
let isCheckpointCollisionDetectionActive = true; // variable to store whether or not the checkpoint collision detection should be active

// function to get the proportional size of something, in relation to the screensize
const proportionalSize = (size) => {
  // porportionalSize only count for sizes with height smaller than 500px
  // divide the size by 500, and multiply it to the innerHeight, to get a consistent proportional size value in return
  // return defualt size if height is above 500
  return innerHeight < 500 ? Math.ceil((size / 500) * innerHeight) : size;
}

// class for the player (the moving block)
class Player {
  // constructor method, that takes in no initial params
  constructor() {
    this.position = {
      x: proportionalSize(10), // sets the default x position (the upper left corner) of the player block
      y: proportionalSize(400), // sets the default y position (the upper left corner) of the player block
    };
    // velocity: the quickness of motion
    this.velocity = {
      x: 0, // set the default x velocity to 0
      y: 0, //set the default y velocity to 0
    };
    this.width = proportionalSize(40); // set the width to be of 40, scaled proportionally for screen sizes with heights below or equal to 500
    this.height = proportionalSize(40); // set the height to be of 40, scaled proportionally for screen sizes with heights below or equal to 500
    this.sideHit = false;
  }

  // method to draw the player on the canvas
  draw() {
    ctx.fillStyle = "#99c9ff"; // sets the player color to a light whitish color
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height); // make a rectangle, where the upper left corner is at position.x pixels from the left, and the upper left corner is position.y pixels from the top (the top left corner of the canvas has position {x: 0, y: 0})
  }

  // method to update the player position, adding the velocity to the positions to move the player
  update() {
    this.draw(); // draw the player
    this.position.x += this.velocity.x; // set the players x position to be equal to the current x position + the velocity of x
    this.position.y += this.velocity.y; // set the player y position to be equal to the current y positoin + the velocity of y

    // If player position + player height + velocity <= canvas height (meaning, if the player position + the height of the player + where the player are heading is inside the canvas (not below it), this is true)
    if (this.position.y + this.height + this.velocity.y <= canvas.height) {
      // if player is above the canvas (position smaller than 0)
      if (this.position.y < 0) {
        this.position.y = 0; // set the position to be 0 (the top of the canvas)
        this.velocity.y = gravity; // resets the y velocity to the gravity (0.5). Reaon: when player goes up, the y velocity is goes deep into the negatives. This resets it to the gravity so that there isn't a pause before the player goes down after readching the top
      }
      this.velocity.y += gravity; // add 0.5 to the velocity, so that the player moves down and down faster and faster, as gravity compounds. Gravity should constantly be applied to the y velocity

    } else { // this means the player, or a part of the player is below the canvas. 
      this.velocity.y = 0; // setting velocity to 0 makes so that player doesn't go down even more
      this.position.y = canvas.height - this.height // set the position of the player to the bottom of the canvas, so that it doesn't go outside of it (this fixed glitching below the canvas)
    }

    // if the x position is smaller than the player width (meaning it is too close to the start, we don't want the player to be able to be at the start)
    if (this.position.x < this.width) {
      this.position.x = this.width; // sets the position to be player.width (there is a gap permanently, player cannot touch left side of screen)
    }

    // if player x position is bigger than canvas width - (2 * player width) - meaning player x is too close to the end
    if (this.position.x >= canvas.width - 2 * this.width) {
      this.position.x = canvas.width - 2 * this.width; // set the player x position 2 * width from the right (reason for 2 * width instead of 1 * width: player position x is calculated from the upper left corner, not right corner. If it was 1 * width, the player would have been at the edge)
    }
  }
}

// a platform class. A platform is a pillar a player can jump onto, it is solid rectangle objects
class Platform {
  // contructor takes the x and y position for the platform pillar (upper corner locations)
  constructor(x, y) {
    this.position = {
      x,
      y,
    };
    this.width = 200; // the width of the platform rectangle
    this.height = proportionalSize(40);  // the proportional height of the platform container
  }
  // method to draw the platform rectangle
  draw() {
    ctx.fillStyle = "#acd157"; // sets the color of the platform container
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height); // make a rectangle where the left top corner x is at position.x, the let top corner y position is position.y, the width is 200, the height is 40
  }
}

// checkpoint class - a checkpoint element
class CheckPoint {
  // contructor takes in x, y, and z.
  constructor(x, y, z) {
    this.position = {
      x, // the starting x position (upper left corner x position of checkpoint box)
      y, // the starting y position (upper left corner y position of checkpoint box)
    };
    this.width = proportionalSize(40); // sets the width to 40 - proportional size to scale based on screen viewport height
    this.height = proportionalSize(70); // sets the height to 70 - proportional size to scale based on screen viewport height
    this.claimed = false; // sets the claimed to false - claimed variable is used to store whether or not the player has reached this checkpoint yet
  };

  // method to draw the checkpoint container
  draw() {
    ctx.fillStyle = "#f1be32"; // set color for checkpoint container
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height); // render rectangle for checkpoint container
  }

  // method to claim checkpoint
  claim() {
    this.width = 0; // set the width to 0 to make it not visible
    this.height = 0; // set the height to 0 to make it not visible
    this.position.y = Infinity; // set position y to infinity to put it off of the screen
    this.claimed = true; // set claimed to true
  }
};

// instantiate player class
const player = new Player();

// array to store all platforms positions
const platformPositions = [
  { x: 500, y: proportionalSize(600) },
  { x: 700, y: proportionalSize(400) },
  { x: 850, y: proportionalSize(360) },
  { x: 1050, y: proportionalSize(150) },
  { x: 2500, y: proportionalSize(450) },
  { x: 2900, y: proportionalSize(400) },
  { x: 3150, y: proportionalSize(350) },
  { x: 3900, y: proportionalSize(450) },
  { x: 4200, y: proportionalSize(400) },
  { x: 4400, y: proportionalSize(200) },
  { x: 4700, y: proportionalSize(150) },
];

// array of instantiated platforms classes, based off off the platformPositions array
const platforms = platformPositions.map(
  (platform) => new Platform(platform.x, platform.y)
);

// array of all checkpoint positions
const checkpointPositions = [
  { x: 1170, y: proportionalSize(80), z: 1 },
  { x: 2900, y: proportionalSize(330), z: 2 },
  { x: 4800, y: proportionalSize(80), z: 3 },
];

// array of instantiated checkpoints classes, based off of the checkpointPositions array
const checkpoints = checkpointPositions.map(
  (checkpoint) => new CheckPoint(checkpoint.x, checkpoint.y, checkpoint.z)
);

// method to animate all changes on the screen
const animate = () => {
  // everytime something changes, it animates that change and clears the canvas, to remove the previous elements, and rerender the new elements
  requestAnimationFrame(animate); // recursively call animate on requestAnimationFrame, to keep on animating all changes

  ctx.clearRect(0, 0, canvas.width, canvas.height); // clear the entire canvas, by removing all pixels in the cleared rectangle area 

  // draw all the platforms
  platforms.forEach((platform) => {
    platform.draw();
  });

  // draw all the checkpoints
  checkpoints.forEach(checkpoint => {
    checkpoint.draw();
  });

  // call the update method of the player, to update the player position
  player.update();

  // if player presses the right key, and the x position of player is smaller than 400
  if (keys.rightKey.pressed && player.position.x < proportionalSize(400)) {
    player.velocity.x = 5; // move the player to the right by 5px

    // if left key is pressed, and the player position is more than 100px from the left
  } else if (keys.leftKey.pressed && player.position.x > proportionalSize(100)) {
    player.velocity.x = -5; // move the player to the left by 5px
  }

  // in short, if the above conditions aren't true, it will run the else block
  // if right key isn't pressed, or left key isn't pressed, or right key is pressed but the player is more than 400px from the left, or left key is pressed and player is less than 100px from the left, this will happen.
  else {
    // set x velocity to 0 (player do not move at all)
    player.velocity.x = 0;

    // if the right key is pressed, and the checkpont collision detection is active
    if (keys.rightKey.pressed && isCheckpointCollisionDetectionActive) {

      // move each platform position 5 px to the left, to simulate the player moving closer to the platforms
      platforms.forEach((platform) => {
        platform.position.x -= 5;
      });

      // move each checkpoint position 5px to the left, simulating the player moving closer to the checkpoints
      checkpoints.forEach((checkpoint) => {
        checkpoint.position.x -= 5;
      });

    }
    // if the left key is pressed, and checkpoint detection collision is active
    else if (keys.leftKey.pressed && isCheckpointCollisionDetectionActive) {
      // move the platform positions 5px to the right, simulating the player moving backwards (to the left), back to the platforms
      platforms.forEach((platform) => {
        platform.position.x += 5;
      });

      // move the checkpoint positions 5px to the right, simulating the player moving backwards (to the left), back to the checkpoints
      checkpoints.forEach((checkpoint) => {
        checkpoint.position.x += 5;
      });
    }
  }

  platforms.forEach((platform) => {
    // array of rules that are conditions, to see if player is directly on top of the platform
    const collisionDetectionRules = [
      player.position.y + player.height <= platform.position.y, // player is above the platform or the player bottom corner y position is at the same y position as the platform
      player.position.y + player.height + player.velocity.y >= platform.position.y, // player + player height + player y velocity is below or equal to the platform y position. This means, the player is on the exact same y position or is moving to the exact same y position, or anything below that. This means, the player is both above or at the same y position as the platform, and the player + player height + player velocity is below the platform y position. This means, the player is both above or on the same y position as the platform, while also moving down to the platform
      player.position.x >= platform.position.x - player.width / 2, // player position x is past or the exact same as the platform position x - 1/2 of player width. This means the player is not before the platform position.
      player.position.x <= platform.position.x + platform.width - player.width / 3, // player position x is not past the platform width - 1/3 of player width.  
    ];

    // if every single one of them is true, set the player velocity to 0, as the player is on the plaform
    if (collisionDetectionRules.every((rule) => rule)) {
      player.velocity.y = 0;
      return;
    }

    const whichSideWasHit = player.position.x + player.width > platform.position.x && player.position.x + player.width < platform.position.x + player.width / 2 ? "left" : player.position.x < platform.position.x + platform.width && player.position.x > platform.position.x + platform.width - player.width / 2 ? "right" : false

    const platformSideHitDetectionRules = [
      player.position.y + player.height >= platform.position.y && player.position.y <= platform.position.y + platform.height,
      whichSideWasHit
    ]

    if (platformSideHitDetectionRules.every(rule => rule)) {
      player.velocity.x = 0;
      player.sideHit = whichSideWasHit;
      return;
    }

    player.sideHit = false;

    // rules to move player down when player hits the side of a platform, or hits the bottom
    const platformDetectionRules = [
      player.position.x >= platform.position.x - player.width / 2, // player position is past or equal to platform x position - 1 / 2 of player width
      player.position.x <= platform.position.x + platform.width - player.width / 3, // player position is before or equal to platform range - 1 / 3 of the player width. This and the above condition will check is player x position is at in the same range as the platform x range roughly
      player.position.y + player.height >= platform.position.y, // player is directly right above platform, or is below the platform
      player.position.y <= platform.position.y + platform.height,
    ];

    if (platformDetectionRules.every(rule => rule)) {
      player.position.y = platform.position.y + player.height;
      player.velocity.y = gravity;
    };
  });

  checkpoints.forEach((checkpoint, index, checkpoints) => {
    const checkpointDetectionRules = [
      player.position.x >= checkpoint.position.x,
      player.position.y >= checkpoint.position.y,
      player.position.y + player.height <=
      checkpoint.position.y + checkpoint.height,
      isCheckpointCollisionDetectionActive,
      player.position.x - player.width <=
      checkpoint.position.x - checkpoint.width + player.width * 0.9,
      index === 0 || checkpoints[index - 1].claimed === true,
    ];

    if (checkpointDetectionRules.every((rule) => rule)) {
      checkpoint.claim();


      if (index === checkpoints.length - 1) {
        isCheckpointCollisionDetectionActive = false;
        showCheckpointScreen("You reached the final checkpoint!");
        movePlayer("ArrowRight", 0, false);
      } else if (player.position.x >= checkpoint.position.x && player.position.x <= checkpoint.position.x + 40) {
        showCheckpointScreen("You reached a checkpoint!");
      }
    };
  });
}


const keys = {
  rightKey: {
    pressed: false
  },
  leftKey: {
    pressed: false
  }
};

const movePlayer = (key, xVelocity, isPressed) => {
  if (!isCheckpointCollisionDetectionActive) {
    player.velocity.x = 0;
    player.velocity.y = 0;
    return;
  }
  if (player.sideHit === "left" && key === "ArrowLeft") {
    keys.leftKey.pressed = isPressed;
    player.velocity.x = 0;
  } else if (player.sideHit === "right" && key === "ArrowRight") {
    keys.rightKey.pressed = isPressed;
    player.velocity.x = 0;
  } else {
    switch (key) {
      case "ArrowLeft":
        keys.leftKey.pressed = isPressed;
        if (xVelocity === 0) {
          player.velocity.x = xVelocity;
        }
        player.velocity.x -= xVelocity;
        break;
      case "ArrowUp":
      case " ":
      case "Spacebar":
        player.velocity.y -= 8;
        break;
      case "ArrowRight":
        keys.rightKey.pressed = isPressed;
        if (xVelocity === 0) {
          player.velocity.x = xVelocity;
        }
        player.velocity.x += xVelocity;
    }
  }
}

const startGame = () => {
  canvas.style.display = "block";
  startScreen.style.display = "none";
  animate();
}

const showCheckpointScreen = (msg) => {
  checkpointScreen.style.display = "block";
  checkpointMessage.textContent = msg;
  if (isCheckpointCollisionDetectionActive) {
    setTimeout(() => (checkpointScreen.style.display = "none"), 2000);
  }
};

startBtn.addEventListener("click", startGame);

window.addEventListener("keydown", ({ key }) => {
  movePlayer(key, 8, true);
});

window.addEventListener("keyup", ({ key }) => {
  movePlayer(key, 0, false);
});

