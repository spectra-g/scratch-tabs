import { MenuItem } from '../../../Tab/types';

export const useVisibleMenuItems = (menuItems: MenuItem[]): MenuItem[] => {
  const visibleItems: MenuItem[] = [];
  
  menuItems.forEach((item, index) => {
    if (item.condition === false) return;
    
    if (item.isSeparator) {
      const nextVisibleItemIndex = menuItems.findIndex(
        (nextItem, nextIndex) =>
          nextIndex > index &&
          nextItem.condition !== false &&
          !nextItem.isSeparator,
      );
      const prevVisible = visibleItems[visibleItems.length - 1];
      
      if (
        prevVisible &&
        !prevVisible.isSeparator &&
        nextVisibleItemIndex !== -1
      ) {
        visibleItems.push(item);
      }
    } else {
      visibleItems.push(item);
    }
  });
  
  // Remove trailing separator if any
  if (
    visibleItems.length > 0 &&
    visibleItems[visibleItems.length - 1].isSeparator
  ) {
    visibleItems.pop();
  }

  return visibleItems;
};