const colors = ['Red', 'Green', 'Blue', 'Yellow', 'Purple', 'Orange'];

export function getNumber() {
    return Math.floor(Math.random() * 100) + 1;
}

export function getColor() {
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
}
