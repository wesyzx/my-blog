import OrbitMotion from './OrbitMotion'
import styles from './OrbitHero.module.css'

export default function OrbitHero() {
  return (
    <section className={styles.hero} aria-labelledby="home-updates-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>RECENT NOTES</p>
        <h1 id="home-updates-title" className={styles.title}>最近更新</h1>
        <p className={styles.intro}>日常、短记与走过的路。</p>
      </div>
      <OrbitMotion />
    </section>
  )
}
