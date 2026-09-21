// Pipeline Jenkins de démonstration ("assurance" pour la soutenance) —
// ne remplace PAS la CI GitHub Actions (.github/workflows/ci.yml), qui reste
// la pipeline réellement utilisée à chaque push/PR. Celui-ci prouve la
// maîtrise de Jenkins sans dupliquer ce que fait déjà GitHub Actions
// (notamment : pas d'analyse SonarQube Cloud ici, pour éviter un double
// scan du même projet — voir RECOVERY.md).
pipeline {
  agent none

  parameters {
    booleanParam(
      name: 'PUSH_TO_DOCKERHUB',
      defaultValue: false,
      description: 'Publier les images sur Docker Hub (nécessite les credentials Jenkins "dockerhub-credentials" — voir RECOVERY.md)'
    )
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {
    stage('Backend — install, build, tests') {
      // Agent Docker "sibling" (voir jenkins/Dockerfile) : ce stage tourne
      // dans un conteneur node:20-alpine jetable, pas dans le conteneur
      // Jenkins lui-même.
      agent { docker { image 'node:20-alpine' } }
      steps {
        dir('backend') {
          sh 'npm ci'
          sh 'npx prisma generate'
          sh 'npm run build'
          // Tests unitaires seulement (jest) : pas de DATABASE_URL fournie
          // ici, donc pas de tests nécessitant une vraie base — cohérent
          // avec le job "Backend" de la CI GitHub Actions.
          sh 'npm test -- --ci --coverage'
        }
      }
    }

    stage('Frontend — install, build, tests') {
      agent { docker { image 'node:20-alpine' } }
      steps {
        dir('frontend') {
          sh 'npm ci'
          sh 'npm run build'
          sh 'npm test -- --ci --coverage'
        }
      }
    }

    stage('Build images Docker') {
      // Retour sur le contrôleur Jenkins : c'est lui qui a le CLI Docker
      // installé et le socket de l'hôte monté (docker-compose.yml).
      agent any
      steps {
        sh 'docker build -t brocaramilou-backend:jenkins-${BUILD_NUMBER} ./backend'
        sh '''
          docker build -t brocaramilou-frontend:jenkins-${BUILD_NUMBER} ./frontend \
            --build-arg NEXT_PUBLIC_API_URL=http://backend:3001 \
            --build-arg NEXT_PUBLIC_SOCKET_URL=http://backend:3001 \
            --build-arg NEXT_PUBLIC_KEYCLOAK_ISSUER=http://keycloak:8080/realms/brocaramilou
        '''
      }
    }

    stage('Publier sur Docker Hub') {
      agent any
      // Désactivé par défaut (paramètre PUSH_TO_DOCKERHUB) : évite un échec
      // de pipeline sur une install Jenkins fraîche tant que les credentials
      // n'ont pas été ajoutés dans l'UI.
      when { expression { return params.PUSH_TO_DOCKERHUB } }
      environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-credentials')
      }
      steps {
        sh 'echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin'
        sh '''
          docker tag brocaramilou-backend:jenkins-${BUILD_NUMBER} $DOCKERHUB_CREDENTIALS_USR/brocaramilou-backend:jenkins-${BUILD_NUMBER}
          docker push $DOCKERHUB_CREDENTIALS_USR/brocaramilou-backend:jenkins-${BUILD_NUMBER}
          docker tag brocaramilou-frontend:jenkins-${BUILD_NUMBER} $DOCKERHUB_CREDENTIALS_USR/brocaramilou-frontend:jenkins-${BUILD_NUMBER}
          docker push $DOCKERHUB_CREDENTIALS_USR/brocaramilou-frontend:jenkins-${BUILD_NUMBER}
        '''
      }
    }
  }

  post {
    always {
      echo 'Pipeline Jenkins terminé — setup initial et credentials documentés dans RECOVERY.md.'
    }
  }
}
