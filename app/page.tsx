"use client"

import { useState } from "react"
import { TopNav } from "@/components/top-nav"
import { CurrencyTracker } from "@/components/currency-tracker"
import { SidebarNav } from "@/components/sidebar-nav"
import { ItemOverviewTable } from "@/components/item-overview-table"
import { ItemPriceChecker } from "@/components/item-price-checker"
import { SessionManager } from "@/components/session-manager"
import { useLeague } from "@/components/league-context"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"currency" | "items">("currency")
  const [sessionReady, setSessionReady] = useState(false)
  const [userSessionId, setUserSessionId] = useState<string>('')
  
  // Consume shared league/realm from context (TopNav now manages selection)
  const { league, realm } = useLeague()
  const [activeSection, setActiveSection] = useState<{ key: string; label: string; type?: "Currency" | "Fragment" }>({ key: 'currency', label: 'Currency', type: 'Currency' })

  const handleSessionReady = (sessionId: string) => {
    setUserSessionId(sessionId)
    setSessionReady(true)
  }

  return (
    <>
  <TopNav />
    <div className="container" style={{paddingTop:'16px'}}>
  {/* Header removed per request; content condenses upward */}

      {/* Session Manager - shows when trade features are not ready */}
      {!sessionReady && (
        <div style={{ marginBottom: '2rem' }}>
          <SessionManager onSessionReady={handleSessionReady} isTradeEnabled={sessionReady} league={league} />
        </div>
      )}

      <div className="layout-split">
        <SidebarNav
          league={league}
          realm={realm}
          activeKey={activeSection.key}
          onSelect={(s) => {
            setActiveSection(s)
            if (s.type) setActiveTab('currency')
          }}
        />
        <div className="flex-1">
          <div className="card">
            <div className="tabs">
              <div className="tab-list">
                <button
                  className={`tab-button ${activeTab === "currency" ? "active" : ""}`}
                  onClick={() => setActiveTab("currency")}
                >
                  💰 Currency Exchange
                </button>
                <button
                  className={`tab-button ${activeTab === "items" ? "active" : ""}`}
                  onClick={() => setActiveTab("items")}
                >
                  🔍 Item Price Checker
                </button>
              </div>
            </div>
            {activeTab === "currency" && activeSection.type && (
              <CurrencyTracker league={league} realm={realm} initialType={activeSection.type} />
            )}
            {activeTab === "currency" && !activeSection.type && (
              <ItemOverviewTable
                league={league}
                realm={realm}
                type={sectionToItemType(activeSection.key) || ''}
                title={activeSection.label}
              />
            )}
            {activeTab === "items" && <ItemPriceChecker />}
          </div>
        </div>
      </div>
      </div>
    </>
  )
}

function sectionToItemType(key: string): string {
  // Map sidebar keys to poe.ninja itemoverview types
  const map: Record<string,string> = {
  // GENERAL / currency-like item overview categories
  'runegrafts': 'Runegraft',
  'allflame-embers': 'AllflameEmber',
  'omens': 'Omen',
  'artifacts': 'Artifact',
    'unique-weapons': 'UniqueWeapon',
    'unique-armours': 'UniqueArmour',
    'unique-accessories': 'UniqueAccessory',
    'unique-flasks': 'UniqueFlask',
    'unique-jewels': 'UniqueJewel',
  'unique-tinctures': 'UniqueTincture',
  'unique-relics': 'UniqueRelic',
    // Some categories may not have poe.ninja endpoints; omit until verified
    'skill-gems': 'SkillGem',
    'cluster-jewels': 'ClusterJewel',
    'maps': 'Map',
    'blighted-maps': 'BlightedMap',
  'blighted-ravaged-maps': 'BlightRavagedMap',
  'unique-maps': 'UniqueMap',
  'delirium-orbs': 'DeliriumOrb',
    'invitations': 'Invitation',
  'memories': 'Memory',
  'base-types': 'BaseType',
    'oils': 'Oil',
    'incubators': 'Incubator',
    'scarabs': 'Scarab',
    'tattoos': 'Tattoo',
    'divination-cards': 'DivinationCard',
  'fossils': 'Fossil',
  'resonators': 'Resonator',
  'beasts': 'Beast',
  'essences': 'Essence',
  'vials': 'Vial',
  }
  return map[key] || ''
}
