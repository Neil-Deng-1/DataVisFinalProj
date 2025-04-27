import pandas as pd

df = pd.read_csv('data/imdbMoviesCleaned.csv')

print(df.head())

df['genres'] = df['genres'].str.split(',')
dfCleaned = df.explode('genres')
dfCleaned['genres'] = dfCleaned['genres'].str.strip()

print(dfCleaned.head())

dfCleaned.to_csv('imdbMoviesCleanedGenreSplit.csv', index=False)