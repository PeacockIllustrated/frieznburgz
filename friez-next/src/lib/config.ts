export const locations = [
    { id: 'south_shields', name: 'South Shields' },
    { id: 'forrest_hall', name: 'Forrest Hall' },
    { id: 'byker', name: 'Byker' },
    { id: 'whitley_bay', name: 'Whitley Bay' },
    { id: 'newcastle_city_center', name: 'Newcastle City Center' }
];

export function getLocationDisplayName(locationId: string): string {
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : locationId;
}

export const itemCategoryIcons: Record<string, { icon: string; colorClass: string }> = {
    'Meat': { icon: 'fas fa-drumstick-bite', colorClass: 'icon-meat' },
    'Cheeses': { icon: 'fas fa-cheese', colorClass: 'icon-cheese' },
    'Produce & Vegetables': { icon: 'fas fa-carrot', colorClass: 'icon-veggies' },
    'Breads & Baked Goods': { icon: 'fas fa-bread-slice', colorClass: 'icon-bread' },
    'Sauces & Condiments': { icon: 'fas fa-bottle-droplet', colorClass: 'icon-sauces' },
    'Specialz Ingredients': { icon: 'fas fa-star', colorClass: 'icon-specialz' },
    'Filletz Ingredients': { icon: 'fas fa-hotdog', colorClass: 'icon-filletz' },
    'Milkshakes of the Week': { icon: 'fas fa-mug-hot', colorClass: 'icon-milkshake' },
    'Other Essentials': { icon: 'fas fa-box-open', colorClass: 'icon-essentials' },
    'Fruits': { icon: 'fas fa-apple-alt', colorClass: 'icon-fruit' },
    'Desserts': { icon: 'fas fa-ice-cream', colorClass: 'icon-desserts' },
    'Uncategorized': { icon: 'fas fa-box', colorClass: 'icon-uncategorized' }
};
