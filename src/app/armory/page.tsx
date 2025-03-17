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
    classId?: number;
    ascendancyClass?: number;
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
  switch (frameType) {
    case 0: return styles.normal;
    case 1: return styles.magic;
    case 2: return styles.rare;
    case 3: return styles.unique;
    case 4: return styles.gem;
    case 5: return styles.currency;
    case 6: return styles.divination;
    case 8: return styles.prophecy;
    case 9: return styles.foil;
    default: return styles.normal;
  }
};

// Function to fetch passive skills data
const getPassiveSkills = async (accountName: string, characterName: string) => {
  try {
    const response = await fetch(`/api/armory/passive?accountName=${encodeURIComponent(accountName)}&characterName=${encodeURIComponent(characterName)}`);
    
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
  const tooltipRef = useRef<HTMLDivElement>(null);

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
    setError('');
    
    try {
      console.log(`Fetching data for character: ${characterName}`);
      const response = await fetch(`/api/armory?accountName=${encodeURIComponent(accountName)}&characterName=${encodeURIComponent(characterName)}`);
      const data = await response.json();
      console.log('Character data response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch character data');
      }
      
      setCharacterData(data);
      
      // Fetch passive skills data
      try {
        const passiveResponse = await fetch(`/api/armory/passive?accountName=${encodeURIComponent(accountName)}&characterName=${encodeURIComponent(characterName)}`);
        const passiveData = await passiveResponse.json();
        console.log('Passive skills data:', passiveData);
        
        if (passiveResponse.ok) {
          setPassiveData(passiveData);
        } else {
          console.error('Failed to fetch passive skills:', passiveData.error);
        }
      } catch (passiveError) {
        console.error('Error fetching passive skills:', passiveError);
      }
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
    updateTooltipPosition(e);
  };

  const handleItemLeave = () => {
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
        onMouseEnter={(e) => handleItemHover(e, item)}
        onMouseLeave={handleItemLeave}
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
    
    const item = characterData.items.find(i => i.inventoryId === slotId);
    
    if (!item) {
      return <div className={styles.emptySlot}></div>;
    }
    
    return (
      <div 
        className={`${styles.itemFrame} ${getFrameClass(item.frameType)}`}
        onMouseEnter={(e) => handleItemHover(e, item)}
        onMouseLeave={handleItemLeave}
      >
        <img 
          src={item.icon} 
          alt={item.name || item.typeLine} 
          className={styles.itemIcon}
        />
        {item.socketedItems && item.socketedItems.length > 0 && (
          <div className={styles.socketCount}>
            {item.socketedItems.length}
          </div>
        )}
      </div>
    );
  };

  // Define slot mappings for the Path of Exile style layout
  const equipmentSlots = [
    { id: 'Weapon', className: styles.Weapon },
    { id: 'Offhand', className: styles.Offhand },
    { id: 'Helmet', className: styles.Helmet },
    { id: 'BodyArmour', className: styles.BodyArmour },
    { id: 'Gloves', className: styles.Gloves },
    { id: 'Boots', className: styles.Boots },
    { id: 'Ring', className: styles.Ring },
    { id: 'Ring2', className: styles.Ring2 },
    { id: 'Amulet', className: styles.Amulet },
    { id: 'Belt', className: styles.Belt },
    { id: 'Flask', className: styles.Flask },
    { id: 'Flask2', className: styles.Flask2 },
    { id: 'Flask3', className: styles.Flask3 },
    { id: 'Flask4', className: styles.Flask4 },
    { id: 'Flask5', className: styles.Flask5 }
  ];

  // Handle login status change
  const handleLoginStatusChange = (isLoggedIn: boolean) => {
    setIsAuthenticated(isLoggedIn);
    
    // Clear any previous rate limit warnings when authentication status changes
    if (isLoggedIn) {
      setShowRateLimitWarning(false);
    }
  };

  // Handle API errors, especially rate limiting
  const handleApiError = (error: any) => {
    setIsLoading(false);
    
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 429) {
        // Rate limit error
        setError(`Rate limited by Path of Exile API. Please try again later or log in with your PoE account for higher rate limits.`);
        setShowRateLimitWarning(true);
      } else if (status === 401) {
        // Authentication error
        setError('Authentication failed. Please log in again.');
        setIsAuthenticated(false);
      } else if (status === 404) {
        setError('Account not found. Please check the account name and try again.');
      } else {
        setError(data.error || 'An error occurred while fetching data');
      }
    } else {
      setError('An error occurred while fetching data');
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-[#af6025] mb-6">Path of Exile Armory</h1>
        
        <div className="bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex-1 mb-4 md:mb-0">
              <h2 className="text-xl font-semibold text-[#a38d6d] mb-2">Character Search</h2>
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    id="accountName"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Enter PoE Account Name"
                    className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#3d3d3d] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#af6025]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !accountName.trim()}
                  className={`px-6 py-2 rounded-md font-medium ${
                    isLoading || !accountName.trim()
                      ? 'bg-[#3d3d3d] cursor-not-allowed'
                      : 'bg-[#af6025] hover:bg-[#c27b3e] transition-colors duration-200'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    'Search'
                  )}
                </button>
              </form>
              <div className="mt-2 text-sm text-[#a38d6d]">
                <p>Enter your Path of Exile account name. Make sure your profile is set to public in your privacy settings.</p>
                <p>For Battle.net accounts, include the # and number (e.g., ExampleName#1234).</p>
              </div>
            </div>
          </div>
          
          {showRateLimitWarning && !isAuthenticated && (
            <div className="bg-[#3a2a1a] border border-[#af6025] rounded-lg p-4 mb-4">
              <p className="text-[#f0c78a] flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                You are experiencing rate limiting from the Path of Exile API. Log in with your PoE account for higher rate limits.
              </p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
              <p className="font-medium">Error: {error}</p>
            </div>
          )}
          
          {isAuthenticated && (
            <div className="bg-[#2a3a2a] border border-[#4a5a4a] rounded-lg p-4 mb-4">
              <p className="text-green-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                You are authenticated with Path of Exile. You now have higher rate limits for API requests.
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64 bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#af6025]"></div>
            </div>
          ) : error ? (
            <div className="bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg p-4 shadow-lg">
              <div className="text-red-500">{error}</div>
            </div>
          ) : characters.length > 0 ? (
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
              
              {/* Character data display */}
              {isLoadingCharacter ? (
                <div className="mt-6 border-t border-[#3d3d3d] pt-6 flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#af6025]"></div>
                </div>
              ) : characterData ? (
                <div className="mt-6 border-t border-[#3d3d3d] pt-6">
                  <h2 className="text-xl font-bold text-[#af6025]">{characterData.character.name}</h2>
                  <div className="mt-2 mb-4">
                    <p className="text-[#a38d6d]">Level {characterData.character.level} {characterData.character.class}</p>
                    <p className="text-[#a38d6d]">{characterData.character.league} League</p>
                  </div>
                  
                  {/* Equipment display */}
                  <div className="flex justify-center mt-6">
                    <div className={styles.equipmentGrid}>
                      {equipmentSlots.map(slot => (
                        <div key={slot.id} className={`${styles.equipmentSlot} ${slot.className}`}>
                          {renderEquipmentSlot(slot.id)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : selectedCharacter ? (
                <div className="mt-6 border-t border-[#3d3d3d] pt-6 text-center">
                  <p className="text-[#a38d6d] mt-4">Select a character to view their equipment</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex justify-center items-center h-64 bg-[#1a1a1a] border border-[#3d3d3d] rounded-lg">
              <p className="text-[#a38d6d]">Enter an account name and click Search to view characters</p>
            </div>
          )}
        </div>
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
  );
}
