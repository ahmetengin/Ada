/**
 * MenuPlanning - AI-powered menu planning and provisioning for yacht voyages
 */

export interface MenuItem {
  id: string;
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'beverage';
  cuisine: string;
  ingredients: string[];
  allergens: string[];
  dietaryFlags: string[]; // vegetarian, vegan, gluten-free, etc.
  servings: number;
  preparationTime: number; // minutes
}

export interface DailyMenu {
  date: Date;
  breakfast: MenuItem[];
  lunch: MenuItem[];
  dinner: MenuItem[];
  snacks: MenuItem[];
}

export interface ProvisioningList {
  voyageId: string;
  duration: number; // days
  peopleCount: number;
  items: ProvisioningItem[];
  estimatedCost: number;
  currency: string;
}

export interface ProvisioningItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  priority: 'essential' | 'important' | 'optional';
  estimatedCost: number;
}

export class MenuPlanning {
  private menus: Map<string, DailyMenu> = new Map();
  private menuDatabase: MenuItem[] = [];

  /**
   * Generate menu for voyage duration
   */
  generateVoyageMenu(
    startDate: Date,
    duration: number,
    passengerCount: number,
    crewCount: number,
    dietaryRestrictions: string[] = []
  ): DailyMenu[] {
    const menus: DailyMenu[] = [];
    const totalPeople = passengerCount + crewCount;

    for (let day = 0; day < duration; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);

      const menu = this.createDailyMenu(date, totalPeople, dietaryRestrictions);
      menus.push(menu);
      this.menus.set(date.toISOString().split('T')[0], menu);
    }

    return menus;
  }

  /**
   * Create daily menu
   */
  private createDailyMenu(
    date: Date,
    peopleCount: number,
    dietaryRestrictions: string[]
  ): DailyMenu {
    // Simplified menu creation - would use AI/ML in production
    return {
      date,
      breakfast: this.selectMenuItems('breakfast', peopleCount, dietaryRestrictions),
      lunch: this.selectMenuItems('lunch', peopleCount, dietaryRestrictions),
      dinner: this.selectMenuItems('dinner', peopleCount, dietaryRestrictions),
      snacks: this.selectMenuItems('snack', peopleCount, dietaryRestrictions),
    };
  }

  /**
   * Select menu items based on criteria
   */
  private selectMenuItems(
    category: MenuItem['category'],
    peopleCount: number,
    dietaryRestrictions: string[]
  ): MenuItem[] {
    // In production, this would use AI to select optimal menu items
    // For now, return sample items
    return [
      {
        id: `${category}-1`,
        name: `Sample ${category} item`,
        category,
        cuisine: 'International',
        ingredients: ['ingredient1', 'ingredient2'],
        allergens: [],
        dietaryFlags: [],
        servings: peopleCount,
        preparationTime: 30,
      },
    ];
  }

  /**
   * Generate provisioning list from menus
   */
  generateProvisioningList(
    voyageId: string,
    menus: DailyMenu[],
    peopleCount: number
  ): ProvisioningList {
    const ingredients = new Map<string, { quantity: number; unit: string; priority: string }>();

    // Aggregate ingredients from all menus
    menus.forEach(menu => {
      [...menu.breakfast, ...menu.lunch, ...menu.dinner, ...menu.snacks].forEach(item => {
        item.ingredients.forEach(ingredient => {
          // Simplified aggregation
          const existing = ingredients.get(ingredient);
          if (existing) {
            existing.quantity += 1;
          } else {
            ingredients.set(ingredient, { quantity: 1, unit: 'unit', priority: 'important' });
          }
        });
      });
    });

    const items: ProvisioningItem[] = Array.from(ingredients.entries()).map(([name, data]) => ({
      name,
      category: 'Food',
      quantity: data.quantity,
      unit: data.unit,
      priority: data.priority as any,
      estimatedCost: 10, // Simplified
    }));

    // Add essentials
    items.push(
      {
        name: 'Drinking Water',
        category: 'Beverages',
        quantity: peopleCount * menus.length * 3,
        unit: 'liters',
        priority: 'essential',
        estimatedCost: peopleCount * menus.length * 2,
      },
      {
        name: 'Coffee',
        category: 'Beverages',
        quantity: peopleCount * menus.length * 0.1,
        unit: 'kg',
        priority: 'important',
        estimatedCost: 50,
      },
      {
        name: 'Tea',
        category: 'Beverages',
        quantity: peopleCount * menus.length * 0.05,
        unit: 'kg',
        priority: 'important',
        estimatedCost: 30,
      }
    );

    const estimatedCost = items.reduce((sum, item) => sum + item.estimatedCost, 0);

    return {
      voyageId,
      duration: menus.length,
      peopleCount,
      items,
      estimatedCost,
      currency: 'USD',
    };
  }

  /**
   * Check for allergens in menu
   */
  checkAllergens(menu: DailyMenu, allergens: string[]): {
    safe: boolean;
    conflicts: Array<{ item: string; allergens: string[] }>;
  } {
    const conflicts: Array<{ item: string; allergens: string[] }> = [];

    const allItems = [...menu.breakfast, ...menu.lunch, ...menu.dinner, ...menu.snacks];

    allItems.forEach(item => {
      const foundAllergens = item.allergens.filter(a => allergens.includes(a));
      if (foundAllergens.length > 0) {
        conflicts.push({ item: item.name, allergens: foundAllergens });
      }
    });

    return {
      safe: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Optimize menu for storage space
   */
  optimizeForStorage(provisioningList: ProvisioningList): {
    optimized: ProvisioningList;
    savedSpace: number;
    recommendations: string[];
  } {
    // Simplified optimization
    const recommendations = [
      'Consider dried goods instead of fresh where possible',
      'Use vacuum-sealed packaging to save space',
      'Consolidate similar items',
    ];

    return {
      optimized: provisioningList,
      savedSpace: 15, // percentage
      recommendations,
    };
  }

  /**
   * Generate shopping list by location
   */
  generateShoppingListByLocation(
    provisioningList: ProvisioningList,
    locations: Array<{ name: string; availability: string[] }>
  ): Map<string, ProvisioningItem[]> {
    const listByLocation = new Map<string, ProvisioningItem[]>();

    locations.forEach(location => {
      const items = provisioningList.items.filter(item =>
        location.availability.includes(item.category)
      );
      listByLocation.set(location.name, items);
    });

    return listByLocation;
  }
}
