import pandas as pd

df = pd.read_excel(r'c:\Users\UTENTE\Desktop\Progetto react sofascore\documentazione\Nuova cartella\2024.xlsx')

print("=" * 60)
print("ANALISI COMPLETA DATASET XLSX - 2024")
print("=" * 60)

print(f"\nTOTALE MATCH: {len(df)}")
print(f"\nSUPERFICI: {df['Surface'].value_counts().to_dict()}")
print(f"SERIE: {df['Series'].value_counts().to_dict()}")

print("\n=== QUOTE ===")
print(f"B365W: min={df['B365W'].min():.2f}, max={df['B365W'].max():.2f}, mean={df['B365W'].mean():.2f}")
print(f"PSW: min={df['PSW'].min():.2f}, max={df['PSW'].max():.2f}, mean={df['PSW'].mean():.2f}")
print(f"MaxW: min={df['MaxW'].min():.2f}, max={df['MaxW'].max():.2f}")
print(f"AvgW: min={df['AvgW'].min():.2f}, max={df['AvgW'].max():.2f}")

print("\n=== RANKING ===")
print(f"Winner Rank: min={df['WRank'].min()}, max={df['WRank'].max()}")
print(f"Loser Rank: min={df['LRank'].min()}, max={df['LRank'].max()}")
print(f"Winner Points: min={df['WPts'].min()}, max={df['WPts'].max()}")
print(f"Loser Points: min={df['LPts'].min()}, max={df['LPts'].max()}")

print("\n=== RIMONTE (Vincitore che ha PERSO primo set) ===")
df['winner_lost_set1'] = (df['W1'] < df['L1'])
print(f"Totale rimonte: {df['winner_lost_set1'].sum()}/{len(df)} = {round(df['winner_lost_set1'].sum()/len(df)*100, 2)}%")

print("\n=== RIMONTE PER SUPERFICIE ===")
for surface in ['Hard', 'Clay', 'Grass']:
    sub = df[df['Surface']==surface]
    rimonte = (sub['W1'] < sub['L1']).sum()
    print(f"  {surface}: {rimonte}/{len(sub)} = {round(rimonte/len(sub)*100,2)}%")

print("\n=== RIMONTE PER SERIE ===")
for series in df['Series'].unique():
    sub = df[df['Series']==series]
    rimonte = (sub['W1'] < sub['L1']).sum()
    print(f"  {series}: {rimonte}/{len(sub)} = {round(rimonte/len(sub)*100,2)}%")

print("\n=== ANALISI 3 SET vs 5 SET ===")
bo3 = df[df['Best of']==3]
bo5 = df[df['Best of']==5]
print(f"Best of 3: {len(bo3)} match")
print(f"  Rimonte: {(bo3['W1'] < bo3['L1']).sum()} = {round((bo3['W1'] < bo3['L1']).sum()/len(bo3)*100,2)}%")
print(f"Best of 5: {len(bo5)} match (Grand Slam)")
print(f"  Rimonte: {(bo5['W1'] < bo5['L1']).sum()} = {round((bo5['W1'] < bo5['L1']).sum()/len(bo5)*100,2)}%")

print("\n=== UPSET ANALYSIS (Ranking peggiore vince) ===")
df['upset'] = df['WRank'] > df['LRank']
print(f"Upset totali: {df['upset'].sum()}/{len(df)} = {round(df['upset'].sum()/len(df)*100, 2)}%")

print("\n=== UPSET PER DIFFERENZA RANKING ===")
df['rank_diff'] = df['WRank'] - df['LRank']
# Upset significativi (vincitore ha rank > 50 posizioni peggiore)
big_upset = df[(df['upset']) & (df['rank_diff'] > 50)]
print(f"Big upset (rank diff > 50): {len(big_upset)} = {round(len(big_upset)/len(df)*100, 2)}%")

print("\n=== ANALISI QUOTE VS RISULTATO ===")
# Favorito = quota più bassa ha vinto?
df['fav_won'] = df['B365W'] < df['B365L']
print(f"Favorito (quota) ha vinto: {df['fav_won'].sum()}/{len(df)} = {round(df['fav_won'].sum()/len(df)*100, 2)}%")

# Quote da underdog che hanno vinto
underdog_wins = df[df['B365W'] > 2.0]
print(f"Vittorie con quota > 2.0: {len(underdog_wins)} = {round(len(underdog_wins)/len(df)*100, 2)}%")
big_underdog = df[df['B365W'] > 3.0]
print(f"Vittorie con quota > 3.0: {len(big_underdog)} = {round(len(big_underdog)/len(df)*100, 2)}%")

print("\n=== TIEBREAK ANALYSIS ===")
# Set finiti 7-6
tb_set1 = df[((df['W1']==7) & (df['L1']==6)) | ((df['W1']==6) & (df['L1']==7))]
tb_set2 = df[((df['W2']==7) & (df['L2']==6)) | ((df['W2']==6) & (df['L2']==7))]
print(f"Set 1 al tiebreak: {len(tb_set1)} = {round(len(tb_set1)/len(df)*100, 2)}%")
print(f"Set 2 al tiebreak: {len(tb_set2)} = {round(len(tb_set2)/len(df)*100, 2)}%")

print("\n=== DOMINANZA (Match in 2 set) ===")
straight_sets = df[df['Wsets']==2]
print(f"Vittorie in 2 set (straight): {len(straight_sets)} = {round(len(straight_sets)/len(df)*100, 2)}%")

print("\n=== VALUE BETTING POTENTIAL ===")
# Confronto Pinnacle vs Bet365
df['ps_vs_b365'] = df['PSW'] - df['B365W']
ps_better = df[df['ps_vs_b365'] > 0.05]
print(f"Match dove Pinnacle > Bet365 (+5%): {len(ps_better)}")

# Max odds vs Avg odds
df['max_vs_avg'] = df['MaxW'] - df['AvgW']
value_potential = df[df['max_vs_avg'] > 0.1]
print(f"Match con Max-Avg > 0.10: {len(value_potential)}")

print("\n" + "=" * 60)
print("FINE ANALISI")
print("=" * 60)
