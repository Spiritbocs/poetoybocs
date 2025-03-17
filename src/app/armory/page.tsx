'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './armory.module.css';
import Navbar from '@/components/Navbar';
// Import will be added when PassiveTreeViewer component is implemented
// import PassiveTreeViewer from '@/components/PassiveTreeViewer';
import { useRouter } from 'next/navigation';

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

interface PassiveSkills {
  // Add properties for PassiveSkills interface
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

// Function to get the frame class based on item rarity
const getFrameClass = (frameType: number): string => {
  const rarityMap: Record<number, string> = {
    0: styles.normal,
    1: styles.magic,
    2: styles.rare,
    3: styles.unique,
    4: styles.gem,
    5: styles.currency,
    6: styles.divination,
    7: styles.quest,
    8: styles.prophecy,
    9: styles.relic
  };
  
  return rarityMap[frameType] || styles.normal;
};

// Function to get the item rarity class
const getItemRarityClass = (frameType: number): string => {
  return getFrameClass(frameType);
};

// Function to fetch passive skills data
const getPassiveSkills = async (accountName: string, character: string) => {
  try {
    const response = await fetch(`/api/armory/passive?accountName=${encodeURIComponent(accountName)}&character=${encodeURIComponent(character)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch passive skills: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching passive skills:', error);
    throw error;
  }
};

export default function ArmoryPage() {
  const router = useRouter();
  const [accountName, setAccountName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false);
  const [error, setError] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  const [passiveData, setPassiveData] = useState<PassiveSkills | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRateLimitWarning, setShowRateLimitWarning] = useState(false);
  const [tooltipItem, setTooltipItem] = useState<Item | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [rateLimit, setRateLimit] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        e.preventDefault();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        e.preventDefault();
      }
    };
    
    const handleBlur = () => {
      // Handle window blur
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountName.trim()) {
      setError('Please enter an account name');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setCharacters([]);
    setSelectedCharacter('');
    setCharacterData(null);

    try {
      console.log('Fetching account data for:', accountName);
      const response = await fetch(`/api/armory?accountName=${encodeURIComponent(accountName)}`);
      const data = await response.json();
      console.log('API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch account data');
      }

      // Check if data is an array (direct characters array)
      if (Array.isArray(data)) {
        console.log('Characters found (direct array):', data.length);
        setCharacters(data);
      } 
      // Check if data.account.characters exists and is an array
      else if (data.account && data.account.characters && Array.isArray(data.account.characters)) {
        console.log('Characters found:', data.account.characters.length);
        setCharacters(data.account.characters);
      }
      // Check if data.characters exists and is an array
      else if (data.characters && Array.isArray(data.characters)) {
        console.log('Characters found:', data.characters.length);
        setCharacters(data.characters);
      } 
      // If it's an error object
      else if (data.error) {
        throw new Error(data.error);
      }
      // Otherwise, invalid format
      else {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format or no characters found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching account data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCharacterSelect = async (characterName: string) => {
    if (selectedCharacter === characterName && characterData) {
      return; // Already selected and loaded
    }
    
    setSelectedCharacter(characterName);
    setIsLoadingCharacter(true);
    setCharacterData(null);
    
    try {
      console.log(`Fetching data for character: ${characterName}`);
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
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching character data:', err);
    } finally {
      setIsLoadingCharacter(false);
    }
  };

  // Map frame type to rarity for tooltip styling
  const mapFrameTypeToRarity = (frameType: number): string => {
    switch (frameType) {
      case 0: return 'normal';
      case 1: return 'magic';
      case 2: return 'rare';
      case 3: return 'unique';
      case 4: return 'gem';
      case 5: return 'currency';
      case 6: return 'divination';
      case 8: return 'prophecy';
      case 9: return 'foil';
      default: return 'normal';
    }
  };

  // Render item properties (damage, armor, etc.)
  const renderItemProperties = (item: any) => {
    if (!item.properties || !Array.isArray(item.properties) || item.properties.length === 0) {
      return null;
    }

    return (
      <div className={styles.tooltipProperties}>
        {item.properties.map((prop: any, index: number) => (
          <div key={`prop-${index}`} className={styles.tooltipProperty}>
            <span className={styles.tooltipPropertyName}>{prop.name}: </span>
            <span className={styles.tooltipPropertyValue}>
              {Array.isArray(prop.values) && prop.values.length > 0 
                ? prop.values[0][0] 
                : ''}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Render item requirements (level, attributes)
  const renderItemRequirements = (item: any) => {
    if (!item.requirements || !Array.isArray(item.requirements) || item.requirements.length === 0) {
      return null;
    }

    return (
      <div className={styles.tooltipRequirements}>
        <div className={styles.tooltipRequirementsHeader}>Requires</div>
        {item.requirements.map((req: any, index: number) => (
          <div key={`req-${index}`} className={styles.tooltipRequirement}>
            <span className={styles.tooltipRequirementName}>{req.name}: </span>
            <span className={styles.tooltipRequirementValue}>
              {Array.isArray(req.values) && req.values.length > 0 
                ? req.values[0][0] 
                : ''}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Render item mods (implicit, explicit)
  const renderItemMods = (item: any) => {
    const mods = [];

    if (item.implicitMods && Array.isArray(item.implicitMods) && item.implicitMods.length > 0) {
      mods.push(
        <div key="implicit" className={styles.tooltipImplicitMods}>
          {item.implicitMods.map((mod: string, index: number) => (
            <div key={`implicit-${index}`} className={styles.tooltipMod}>{mod}</div>
          ))}
        </div>
      );
    }

    if (item.explicitMods && Array.isArray(item.explicitMods) && item.explicitMods.length > 0) {
      mods.push(
        <div key="explicit" className={styles.tooltipExplicitMods}>
          {item.explicitMods.map((mod: string, index: number) => (
            <div key={`explicit-${index}`} className={styles.tooltipMod}>{mod}</div>
          ))}
        </div>
      );
    }

    return mods.length > 0 ? <>{mods}</> : null;
  };

  const handleItemHover = (e: React.MouseEvent, item: Item) => {
    setTooltipItem(item);
    setTooltipVisible(true);
    updateTooltipPosition(e);
  };

  const handleItemMouseLeave = () => {
    setTooltipItem(null);
  };

  const handleItemMouseMove = (e: React.MouseEvent) => {
    if (tooltipVisible) {
      updateTooltipPosition(e);
    }
  };

  const updateTooltipPosition = (e: React.MouseEvent) => {
    const x = e.clientX + 15; 
    const y = e.clientY + 15;
    setTooltipPosition({ x, y });
  };

  const handleItemMouseEnter = (e: React.MouseEvent, item: Item) => {
    handleItemHover(e, item);
  };

  const handleTooltipScroll = (e: React.WheelEvent) => {
    e.preventDefault();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    if (tooltipRect) {
      const x = tooltipRect.left + 15; 
      const y = tooltipRect.top + 15;
      setTooltipPosition({ x, y });
    }
  };

  const renderItem = (item: Item) => {
    if (!item) return null;
    
    console.log('Rendering item:', item);
    
    const itemRarity = item.frameType !== undefined ? getItemRarityClass(item.frameType) : '';
    const isUnique = item.frameType === 3;
    const isFlask = item.inventoryId?.includes('Flask');
    
    return (
      <div 
        className={styles.item}
        onMouseEnter={(e) => handleItemMouseEnter(e, item)}
        onMouseLeave={handleItemMouseLeave}
        onMouseMove={handleItemMouseMove}
      >
        {item.icon && (
          <div className={styles.itemIcon}>
            <img src={item.icon} alt={item.name || 'Item'} />
            {isUnique && (
              <a 
                href={`https://www.poewiki.net/wiki/${encodeURIComponent(item.name || '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.wikiLink}
                onClick={(e) => e.stopPropagation()}
              >
                <span className={styles.wikiLinkIcon}>?</span>
              </a>
            )}
          </div>
        )}
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
    { id: 'Flask4', className:styles.slotFlask4 },
    { id: 'Flask5', className: styles.slotFlask5 },
  ];

  return (
    <div 
      className="min-h-screen bg-[#0c0c0e] text-white"
      onWheel={tooltipItem && tooltipVisible ? handleTooltipScroll : undefined}
    >
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
              <h3 className="text-lg font-medium text-[#af6025] mb-4">Characters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {characters.map(character => (
                  <div 
                    key={character.name} 
                    onClick={() => handleCharacterSelect(character.name)} 
                    className={`p-3 rounded cursor-pointer transition-colors duration-200 ${
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
                  </div>
                ))}
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
