import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from './theme';

/**
 * Anecdote musicale du jour.
 *
 * Le fichier ephemeride.json est hébergé sur GitHub Pages, à côté de la
 * politique de confidentialité. L'app le télécharge une fois par jour et le
 * garde en cache : on peut donc corriger ou enrichir une anecdote sans
 * recompiler l'application.
 *
 * Deux cas d'affichage :
 *   - une éphéméride datée pour les jours qui en ont une (« Il y a N ans »)
 *   - sinon une anecdote intemporelle, tirée d'un fonds commun, choisie de
 *     façon déterministe pour que tous les membres voient la même le même jour.
 */

// ⚠️ À RENSEIGNER : l'adresse de ton GitHub Pages, celle de la politique de
// confidentialité, avec ephemeride.json à la place de index.html.
// Exemple : 'https://zabeth.github.io/chacureuils/ephemeride.json'
const URL_EPHEMERIDE = 'https://TON-COMPTE.github.io/TON-DEPOT/ephemeride.json';

const CLE_CACHE = 'ephemeride_contenu';
const CLE_DATE = 'ephemeride_telechargee_le';

type Entree = { annee: number | null; sujet: string; texte: string };
type Fichier = { jours: { [cle: string]: Entree }; intemporelles: Entree[] };

// Jeu de secours embarqué, pour que la carte ne soit jamais vide
// au premier lancement ou hors connexion.
const SECOURS: Fichier = {
  jours: {},
  intemporelles: [
    { annee: null, sujet: 'La', texte: "Le la de référence est passé de 415 Hz à l'époque baroque à 440 Hz aujourd'hui. Les orchestres continuent de monter." },
    { annee: null, sujet: 'Clé de sol', texte: 'Les clés de sol, fa et ut sont des lettres déformées par des siècles de copie à la main : G, F et C.' },
    { annee: null, sujet: 'Stradivarius', texte: "On ignore toujours ce qui fait le son des Stradivarius. À l'aveugle, des solistes ne les distinguent pas de bons violons modernes." },
    { annee: null, sujet: 'Chef d\'orchestre', texte: "Avant la baguette, on battait la mesure avec une canne frappée au sol. Lully s'en transperça le pied et en mourut." },
    { annee: null, sujet: 'Partition', texte: "La notation sur portée a été mise au point par Guido d'Arezzo vers l'an 1030. Avant lui, on apprenait les chants d'oreille." },
  ],
};

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function cleDuJour(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function jourDeLAnnee(d: Date) {
  const debut = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - debut.getTime()) / 86400000);
}

export function CarteEphemeride() {
  const [fichier, setFichier] = useState<Fichier>(SECOURS);

  useEffect(() => {
    let annule = false;
    const maintenant = new Date();
    const aujourdhui = `${maintenant.getFullYear()}-${cleDuJour(maintenant)}`;

    (async () => {
      // 1. Afficher tout de suite ce qu'on a en cache
      let dejaTelechargee = null;
      try {
        const [[, contenu], [, quand]] = await AsyncStorage.multiGet([CLE_CACHE, CLE_DATE]);
        dejaTelechargee = quand;
        if (contenu && !annule) {
          const lu = JSON.parse(contenu);
          if (lu && lu.jours) setFichier(lu);
        }
      } catch {
        // Cache illisible : on garde le jeu de secours
      }

      // 2. Rafraîchir au plus une fois par jour
      if (dejaTelechargee === aujourdhui) return;
      try {
        const reponse = await fetch(URL_EPHEMERIDE);
        if (!reponse.ok) return;
        const recu = await reponse.json();
        if (!recu || !recu.jours) return;
        if (!annule) setFichier(recu);
        await AsyncStorage.multiSet([
          [CLE_CACHE, JSON.stringify(recu)],
          [CLE_DATE, aujourdhui],
        ]);
      } catch {
        // Hors connexion : le cache suffit
      }
    })();

    return () => { annule = true; };
  }, []);

  const maintenant = new Date();
  const datee = fichier.jours?.[cleDuJour(maintenant)] || null;

  const fonds = fichier.intemporelles?.length ? fichier.intemporelles : SECOURS.intemporelles;
  const intemporelle = fonds[jourDeLAnnee(maintenant) % fonds.length];

  const entree = datee || intemporelle;
  if (!entree) return null;

  const anneesEcoulees = datee && datee.annee ? maintenant.getFullYear() - datee.annee : null;

  function ouvrirWikipedia() {
    // Une URL de recherche plutôt qu'un lien d'article : elle aboutit toujours
    const url = 'https://fr.wikipedia.org/w/index.php?search=' + encodeURIComponent(entree.sujet);
    Linking.openURL(url).catch(() => {});
  }

  return (
    <TouchableOpacity style={styles.carte} onPress={ouvrirWikipedia} activeOpacity={0.85}>
      <Text style={styles.label}>
        {datee ? '🎼 Un jour comme aujourd\'hui' : '🎼 Le saviez-vous ?'}
      </Text>

      {datee && datee.annee ? (
        <Text style={styles.date}>
          {maintenant.getDate()} {MOIS[maintenant.getMonth()]} {datee.annee}
          {anneesEcoulees ? ` · il y a ${anneesEcoulees} ans` : ''}
        </Text>
      ) : null}

      <Text style={styles.texte}>{entree.texte}</Text>

      <Text style={styles.lien}>{entree.sujet} sur Wikipédia ↗</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  carte: {
    margin: 16,
    marginBottom: 32,
    padding: 20,
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    borderLeftWidth: 4,
    borderLeftColor: theme.primaryDark,
  },
  label: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    color: theme.primaryDeep,
    fontWeight: '600',
    marginBottom: 8,
  },
  texte: {
    fontSize: 14,
    color: theme.primaryDeep,
    lineHeight: 21,
  },
  lien: {
    fontSize: 11,
    color: theme.muted,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
