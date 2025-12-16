export function checkAABBCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function resolvePlatformCollision(player, platform) {
  if (!checkAABBCollision(player, platform)) {
    return;
  }

  const overlapX =
    player.x + player.width / 2 < platform.x + platform.width / 2
      ? player.x + player.width - platform.x
      : platform.x + platform.width - player.x;

  const overlapY =
    player.y + player.height / 2 < platform.y + platform.height / 2
      ? player.y + player.height - platform.y
      : platform.y + platform.height - player.y;

  if (overlapX < overlapY) {
    // horizontal collision
    if (player.x < platform.x) {
      player.x -= overlapX;
    } else {
      player.x += overlapX;
    }
    player.velocity.x = 0;
  } else {
    // vertical collision
    if (player.y < platform.y) {
      player.y -= overlapY;
      player.velocity.y = 0;
      player.isOnGround = true;
      player.groundedPlatform = platform;
    } else {
      player.y += overlapY;
      player.velocity.y = Math.min(player.velocity.y, 0);
    }
  }
}

