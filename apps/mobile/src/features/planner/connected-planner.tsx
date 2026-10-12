import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Keyboard, ScrollView, View } from 'react-native';
import type { Pet } from '@vetify/planner-shared/pets';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, useIsMutating } from '@tanstack/react-query';
import { getSession } from '../../auth/session';
import { usePrincipal } from '../../auth/auth-boundary';
import { AppHeader } from '../../components/app-header';
import { AppTabBar, type AppTab } from '../../components/app-tab-bar';
import { ScreenActivity } from '../../components/screen-activity';
import { colors, Notice } from '../../components/ui';
import { usePets } from '../../services/pet-queries';
import { AccountScreen } from '../account/account-screen';
import { PetsScreen } from '../pets/pets-screen';
import { PetSwitcher } from '../pets/pet-switcher';
import { useSelectedPet } from '../pets/use-selected-pet';
import { usePlannerToday } from './use-planner-today';
import PlannerPage from './planner-page';

export function ConnectedPlanner() {
  const [online, setOnline] = useState(true);
  const [screen, setScreen] = useState<'workspace' | 'pets' | 'account'>('workspace');
  const [tab, setTab] = useState<AppTab>('tracker');
  const [switcher, setSwitcher] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const pets = usePets();
  const principal = usePrincipal();
  const today = usePlannerToday(principal?.region.timeZone ?? 'Asia/Manila');
  const { selectedPet, selectPet, ready } = useSelectedPet(getSession()?.user.id ?? '', pets.data);
  const busy = useIsMutating() > 0;
  const showPets =
    screen === 'pets' || (screen === 'workspace' && ready && !pets.isPending && !selectedPet);
  function openAccount() {
    Keyboard.dismiss();
    setScreen('account');
  }
  function managePets() {
    if (busy) return;
    Keyboard.dismiss();
    setSwitcher(false);
    setScreen('pets');
  }
  function changeTab(value: AppTab) {
    if (busy || !selectedPet) return;
    Keyboard.dismiss();
    setTab(value);
    setScreen('workspace');
  }
  useEffect(() => {
    if (screen === 'workspace') return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy) setScreen('workspace');
      return true;
    });
    return () => listener.remove();
  }, [screen, busy]);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        const connected = state.isConnected !== false && state.isInternetReachable !== false;
        setOnline(connected);
        onlineManager.setOnline(connected);
      }),
    [],
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      focusManager.setFocused(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        pet={selectedPet}
        switchingDisabled={busy || !ready}
        onSwitchPet={() => {
          Keyboard.dismiss();
          setSwitcher(true);
        }}
        onOpenAccount={openAccount}
      />
      <ScreenActivity value={screen === 'workspace'}>
        <View style={{ flex: 1, display: screen === 'workspace' && !showPets ? 'flex' : 'none' }}>
          {!ready || pets.isPending ? (
            <ActivityIndicator
              accessibilityLabel="Loading your pets"
              color={colors.primary}
              style={{ marginTop: 32 }}
            />
          ) : (
            selectedPet && (
              <>
                {!online && (
                  <View style={{ padding: 16 }}>
                    <Notice tone="warning">You are offline. Reconnect to save changes.</Notice>
                  </View>
                )}
                <PlannerPage
                  key={selectedPet.id}
                  pet={selectedPet}
                  tab={tab}
                  onChangeTab={changeTab}
                />
              </>
            )
          )}
        </View>
      </ScreenActivity>
      <ScreenActivity value={showPets}>
        <View style={{ flex: 1, display: showPets ? 'flex' : 'none' }}>
          <PetsPage
            today={today}
            onSelect={(pet) => {
              if (busy) return;
              selectPet(pet);
              setTab('tracker');
              setScreen('workspace');
            }}
          />
        </View>
      </ScreenActivity>
      <View style={{ flex: 1, display: screen === 'account' ? 'flex' : 'none' }}>
        <AccountScreen onOpenPets={managePets} navigationDisabled={busy} />
      </View>
      {!keyboardVisible && (
        <AppTabBar value={tab} onChange={changeTab} disabled={busy || !selectedPet || !ready} />
      )}
      <PetSwitcher
        visible={switcher}
        pets={pets.data ?? []}
        selectedId={selectedPet?.id}
        loading={pets.isPending}
        error={pets.error?.message}
        onRetry={() => void pets.refetch()}
        onClose={() => setSwitcher(false)}
        onManagePets={managePets}
        onSelect={(pet) => {
          if (busy) return;
          selectPet(pet);
          setSwitcher(false);
          setScreen('workspace');
        }}
      />
    </View>
  );
}

function PetsPage({ today, onSelect }: { today: string; onSelect: (pet: Pet) => void }) {
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 28,
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
      }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <PetsScreen today={today} onOpenPet={onSelect} />
    </ScrollView>
  );
}
