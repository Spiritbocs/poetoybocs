'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './armory.module.css';
import Navbar from '@/components/Navbar';

interface Character {
  name: string;
  class: string;
  level: number;
  league: string;
}

interface Item {
  id: string;
  name: string;
  typeLine: string;
  baseType?: string;
  identified: boolean;
  itemLevel: number;
  frameType: number;
  icon: string;
  inventoryId: string;
  socketedItems?: Item[];
  properties?: Array<{
    name: string;
    values: Array<[string, number]>;
    displayMode: number;
  }>;
  requirements?: Array<{
    name: string;
    values: Array<[string, number]>;
    displayMode: number;
  }>;
  explicitMods?: string[];
  implicitMods?: string[];
  craftedMods?: string[];
  enchantMods?: string[];
  corrupted?: boolean;
}

interface CharacterData {
  character: {
    name: string;
    class: string;
    level: number;
    league: string;
  };
  items: Item[];
}

function mapFrameTypeToRarity(frameType: number): string {
  switch (frameType) {
    case 0: return 'normal';
    case 1: return 'magic';
    case 2: return 'rare';
    case 3: return 'unique';
    case 4: return 'gem';
    case 5: return 'currency';
    case 6: return 'divination';
    case 7: return 'quest';
    case 8: return 'prophecy';
    case 9: return 'relic';
    default: return 'normal';
  }
}

function getSlotName(inventoryId: string): string {
  const slotMap: Record<string, string> = {
    Weapon: 'Main Hand',
    Offhand: 'Off Hand',
    Weapon2: 'Swap Main Hand',
    Offhand2: 'Swap Off Hand',
    Helm: 'Helmet',
    BodyArmour: 'Body Armour',
    Gloves: 'Gloves',
    Boots: 'Boots',
    Amulet: 'Amulet',
    Ring: 'Left Ring',
    Ring2: 'Right Ring',
    Belt: 'Belt',
    Flask: 'Flask 1',
    Flask2: 'Flask 2',
    Flask3: 'Flask 3',
    Flask4: 'Flask 4',
    Flask5: 'Flask 5',
  };

  return slotMap[inventoryId] || inventoryId;
}

export default function ArmoryPage() {
  const [accountName, setAccountName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  const [tooltipItem, setTooltipItem] = useState<Item | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return;

    setIsLoading(true);
    setError(null);
    setCharacters([]);
    setSelectedCharacter(null);
    setCharacterData(null);

    try {
      const response = await fetch(`/api/armory?accountName=${encodeURIComponent(accountName)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch account data');
      }

      if (data.characters && Array.isArray(data.characters)) {
        setCharacters(data.characters);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCharacterSelect = async (characterName: string) => {
    setIsLoading(true);
    setError('');
    setSelectedCharacter(characterName);
    setCharacterData(null);
    
    try {
      const response = await fetch(`/api/armory?accountName=${encodeURIComponent(accountName)}&character=${encodeURIComponent(characterName)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch character data: ${response.status}`);
      }
      
      const character = await response.json();
      
      if (!character) {
        throw new Error('No character data returned');
      }
      
      // Log the character data to debug
      console.log(`Character data for ${characterName}:`, character);
      
      // Always ensure there's an items array, even if empty
      const items = character.items || [];
      if (!Array.isArray(items)) {
        console.error('Items is not an array for character:', character);
        throw new Error('Character items data is invalid (not an array)');
      }
      
      // Format the data to match the expected structure
      setCharacterData({
        character: {
          name: character.name,
          class: character.class,
          level: character.level,
          league: character.league
        },
        items: items
      });
    } catch (err) {
      console.error('Error fetching character data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setSelectedCharacter(null);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItemProperties = (item: Item) => {
    if (!item.properties || item.properties.length === 0) return null;

    return (
      <div className={styles.tooltipProperties}>
        {item.properties.map((prop, index) => (
          <div key={index}>
            {prop.name}: {prop.values.map(([value]) => value).join(', ')}
          </div>
        ))}
      </div>
    );
  };

  const renderItemRequirements = (item: Item) => {
    if (!item.requirements || item.requirements.length === 0) return null;

    return (
      <div className={styles.tooltipRequirements}>
        <span>Requires: </span>
        {item.requirements.map((req, index) => (
          <span key={index}>
            {index > 0 && ', '}
            {req.name} {req.values.map(([value]) => value).join(', ')}
          </span>
        ))}
      </div>
    );
  };

  const renderItemMods = (item: Item) => {
    return (
      <>
        {item.implicitMods && item.implicitMods.length > 0 && (
          <div className={styles.tooltipImplicitMods}>
            {item.implicitMods.map((mod, index) => (
              <div key={`implicit-${index}`}>{mod}</div>
            ))}
          </div>
        )}
        
        {item.explicitMods && item.explicitMods.length > 0 && (
          <div className={styles.tooltipExplicitMods}>
            {item.explicitMods.map((mod, index) => (
              <div key={`explicit-${index}`}>{mod}</div>
            ))}
          </div>
        )}
        
        {item.craftedMods && item.craftedMods.length > 0 && (
          <div className={styles.tooltipCraftedMods}>
            {item.craftedMods.map((mod, index) => (
              <div key={`crafted-${index}`}>{mod}</div>
            ))}
          </div>
        )}
        
        {item.enchantMods && item.enchantMods.length > 0 && (
          <div className={styles.tooltipEnchantMods}>
            {item.enchantMods.map((mod, index) => (
              <div key={`enchant-${index}`}>{mod}</div>
            ))}
          </div>
        )}
        
        {item.corrupted && (
          <div className={styles.tooltipCorrupted}>Corrupted</div>
        )}
      </>
    );
  };

  const handleItemMouseEnter = (e: React.MouseEvent, item: Item) => {
    setTooltipItem(item);
    updateTooltipPosition(e);
  };

  const handleItemMouseLeave = () => {
    setTooltipItem(null);
  };

  const handleItemMouseMove = (e: React.MouseEvent) => {
    if (tooltipItem) {
      updateTooltipPosition(e);
    }
  };

  const updateTooltipPosition = (e: React.MouseEvent) => {
    const tooltipWidth = 300; // Match this with the CSS width
    const tooltipHeight = tooltipRef.current?.offsetHeight || 400;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate position to keep tooltip within viewport
    let x = e.clientX + 15;
    let y = e.clientY + 15;
    
    // Adjust horizontal position if tooltip would go off-screen
    if (x + tooltipWidth > viewportWidth) {
      x = e.clientX - tooltipWidth - 15;
    }
    
    // Adjust vertical position if tooltip would go off-screen
    if (y + tooltipHeight > viewportHeight) {
      y = viewportHeight - tooltipHeight - 15;
      if (y < 0) y = 15; // If tooltip is taller than viewport, align to top
    }
    
    setTooltipPosition({ x, y });
  };

  const renderItem = (item: Item) => {
    const rarityClass = mapFrameTypeToRarity(item.frameType);
    
    return (
      <div 
        className={styles.item}
        onMouseEnter={(e) => handleItemMouseEnter(e, item)}
        onMouseLeave={handleItemMouseLeave}
        onMouseMove={handleItemMouseMove}
      >
        <div className={`${styles.itemHeader} ${styles[rarityClass]}`}>
          <div className={styles.itemName}>
            <span className={styles.itemNameText}>{item.name || item.typeLine}</span>
            {item.name && <span className={styles.itemType}>{item.typeLine}</span>}
          </div>
        </div>
        <div className={styles.itemContent}>
          <div className={styles.itemImage}>
            {item.icon ? (
              <img 
                src={item.icon} 
                alt={item.name || item.typeLine} 
                onError={(e) => {
                  // If image fails to load, replace with a placeholder
                  (e.target as HTMLImageElement).src = "https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyRerollRare.png";
                  console.error(`Failed to load image for item: ${item.name || item.typeLine}`);
                }}
              />
            ) : (
              <div className={styles.noImage}>No Image</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEquipmentSlot = (slotId: string) => {
    if (!characterData) return null;

    const item = characterData.items.find(item => item.inventoryId === slotId);

    return item ? renderItem(item) : <div className={styles.emptySlot}></div>;
  };

  // Define slot mappings for the Path of Exile style layout
  const equipmentSlots = [
    { id: 'Weapon', className: styles.slotWeapon },
    { id: 'Helm', className: styles.slotHelm },
    { id: 'Amulet', className: styles.slotAmulet },
    { id: 'Offhand', className: styles.slotOffhand },
    { id: 'Gloves', className: styles.slotGloves },
    { id: 'BodyArmour', className: styles.slotBodyArmour },
    { id: 'Ring', className: styles.slotRing },
    { id: 'Boots', className: styles.slotBoots },
    { id: 'Ring2', className: styles.slotRing2 },
    { id: 'Belt', className: styles.slotBelt },
    { id: 'Flask', className: styles.slotFlask },
    { id: 'Flask2', className: styles.slotFlask2 },
    { id: 'Flask3', className: styles.slotFlask3 },
    { id: 'Flask4', className: styles.slotFlask4 },
    { id: 'Flask5', className: styles.slotFlask5 },
  ];

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg p-6 mb-6 shadow-lg">
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="accountName" className="block text-sm font-medium text-[#a38d6d] mb-2">
                Account Name
              </label>
              <input
                id="accountName"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Enter PoE account name"
                className="w-full px-4 py-2 bg-[#252525] border border-[#3d3d3d] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#af6025]"
                required
              />
            </div>
            <button 
              type="submit" 
              className="px-6 py-2 bg-[#af6025] text-white font-medium rounded-md hover:bg-[#c27b3e] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !accountName.trim()}
            >
              {isLoading ? 'Loading...' : 'Search'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-[#3d1c1c] border border-[#b41e1e] text-white p-4 rounded-md mb-6">
            <p className="font-medium">{error}</p>
            {error.includes('private') && (
              <p className="mt-2 text-sm">
                Make sure your profile is set to public in your 
                <a href="https://www.pathofexile.com/my-account/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ffcc00] hover:underline ml-1">
                  Path of Exile privacy settings
                </a>.
              </p>
            )}
          </div>
        )}

        {characters.length > 0 && (
          <div className="mb-6">
            <div className="bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg p-4 shadow-lg">
              <h2 className="text-lg font-medium text-[#af6025] mb-4">Select a character to view their equipment</h2>
              <div className={`${styles.characterScroller}`}>
                <ul className="flex space-x-4 min-w-max pb-2">
                  {characters.map(character => (
                    <li 
                      key={character.name} 
                      onClick={() => handleCharacterSelect(character.name)} 
                      className={`p-3 rounded cursor-pointer transition-colors duration-200 min-w-[200px] ${
                        selectedCharacter === character.name 
                          ? 'bg-[#2a2a2a] border-l-4 border-[#af6025]' 
                          : 'hover:bg-[#252525] border border-[#3d3d3d]'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-[#af6025]">{character.name}</span>
                        <span className="text-sm text-[#a38d6d]">
                          Level {character.level} {character.class} ({character.league})
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {characters.length > 0 && (
          <div>
            {characterData ? (
              <div className="bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg p-4 shadow-lg">
                <div className="mb-6 border-b border-[#3d3d3d] pb-4">
                  <h2 className="text-xl font-bold text-[#af6025]">{characterData.character.name}</h2>
                  <div className="mt-2">
                    <p className="text-[#a38d6d]">Level {characterData.character.level} {characterData.character.class}</p>
                    <p className="text-[#a38d6d]">{characterData.character.league} League</p>
                  </div>
                </div>

                {characterData.items.length > 0 ? (
                  <div className="flex justify-center items-center">
                    <div className={styles.equipmentGrid}>
                      {equipmentSlots.map(slot => (
                        <div key={slot.id} className={`${styles.equipmentSlot} ${slot.className}`}>
                          {renderEquipmentSlot(slot.id)}
                        </div>
                      ))}
                    </div>
                    
                    {/* Item tooltip */}
                    {tooltipItem && (
                      <div 
                        ref={tooltipRef}
                        className={`${styles.itemTooltip} ${styles.itemTooltipVisible}`} 
                        style={{ 
                          left: `${tooltipPosition.x}px`, 
                          top: `${tooltipPosition.y}px` 
                        }}
                      >
                        <div className={`${styles.tooltipHeader} ${styles[mapFrameTypeToRarity(tooltipItem.frameType)]}`}>
                          <div className={styles.tooltipName}>{tooltipItem.name || tooltipItem.typeLine}</div>
                          {tooltipItem.name && <div className={styles.tooltipType}>{tooltipItem.typeLine}</div>}
                        </div>
                        
                        <div className={styles.tooltipSection}>
                          {renderItemProperties(tooltipItem)}
                        </div>
                        
                        <div className={styles.tooltipSection}>
                          {renderItemRequirements(tooltipItem)}
                        </div>
                        
                        <div className={styles.tooltipSection}>
                          {renderItemMods(tooltipItem)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-[#a38d6d] mb-2">No equipment data available for this character.</p>
                    <p className="text-sm text-[#777]">This could be due to API limitations or the character being inactive.</p>
                    <button 
                      onClick={() => handleCharacterSelect(selectedCharacter!)}
                      className="mt-4 px-4 py-2 bg-[#af6025] text-white rounded-md hover:bg-[#c27b3e] transition-colors duration-200"
                    >
                      Retry Loading Equipment
                    </button>
                  </div>
                )}
              </div>
            ) : selectedCharacter ? (
              <div className="flex justify-center items-center h-64 bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#af6025]"></div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-64 bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg">
                <p className="text-[#a38d6d]">Select a character to view their equipment</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
