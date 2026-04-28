export type Macros = {
  cals: number
  p: number
  c: number
  f: number
}

export type LibraryFood = {
  id: string
  name: string
} & Macros

export type Meal = {
  id: string
  name: string
  at: number
} & Macros

export type DayLog = {
  ptDone: string[]
  lifted: boolean
  iced: boolean
  meals: Meal[]
}

export type Config = {
  ptExercises: string[]
  macroTargets: Macros
  foodLibrary: LibraryFood[]
}

export type Store = {
  version: 1
  config: Config
  days: Record<string, DayLog>
}

export const emptyDay = (): DayLog => ({
  ptDone: [],
  lifted: false,
  iced: false,
  meals: [],
})

export const sumMacros = (meals: Meal[]): Macros =>
  meals.reduce(
    (acc, m) => ({
      cals: acc.cals + m.cals,
      p: acc.p + m.p,
      c: acc.c + m.c,
      f: acc.f + m.f,
    }),
    { cals: 0, p: 0, c: 0, f: 0 },
  )

export const defaultStore = (): Store => ({
  version: 1,
  config: {
    ptExercises: [],
    macroTargets: { cals: 2200, p: 180, c: 220, f: 70 },
    foodLibrary: [],
  },
  days: {},
})
