import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons"
import {
  Button,
  Container,
  Flex,
  FormControl,
  FormErrorMessage,
  Icon,
  Image,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Text,
  useBoolean,
} from "@chakra-ui/react"
import {
  Link as RouterLink,
  createFileRoute,
  redirect,
} from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"

import Logo from "/assets/images/lm-logo-blk.svg"
import type { Body_login_login_access_token as AccessToken } from "../client"
import useAuth, { isLoggedIn } from "../hooks/useAuth"
import { emailPattern } from "../utils"

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/" })
    }
  },
})

function Login() {
  const [show, setShow] = useBoolean()
  const { loginMutation, error, resetError } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccessToken>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { username: "", password: "" },
  })

  const onSubmit: SubmitHandler<AccessToken> = async (data) => {
    if (isSubmitting) return

    resetError()

    try {
      await loginMutation.mutateAsync(data)
    } catch {
      // error is handled by useAuth hook
    }
  }

  // Social media logo components
  const GitHubLogo = () => (
    <Link
      href="https://github.com/iconluxurygroup"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image
        src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
        alt="GitHub Logo"
        boxSize="32px"
      />
    </Link>
  )

  const LinkedInLogo = () => (
    <Link
      href="https://www.linkedin.com/company/iconluxurygroup"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image
        src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png"
        alt="LinkedIn Logo"
        boxSize="32px"
      />
    </Link>
  )

  const XLogo = () => (
    <Link
      href="https://twitter.com/iconluxurygroup"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image src="/assets/images/twitter-x.svg" alt="X Logo" boxSize="32px" />
    </Link>
  )

  return (
    <Flex minH="100vh" align="center" justify="center" py={16} px={4}>
      <Container
        as="form"
        onSubmit={handleSubmit(onSubmit)}
        maxW="md"
        bg="surface"
        borderWidth="1px"
        borderColor="border"
        borderRadius="xl"
        boxShadow="none"
        py={10}
        px={{ base: 6, md: 10 }}
        display="flex"
        flexDir="column"
        gap={6}
      >
      <Link
        href="https://iconluxury.group"
        target="_blank"
        rel="noopener noreferrer"
        alignSelf="center"
      >
        <Image
          src={Logo}
          alt="iconluxurygroup logo"
          height="auto"
          maxW="180px"
        />
      </Link>
      <FormControl id="username" isInvalid={!!errors.username || !!error}>
        <Input
          id="username"
          {...register("username", {
            required: "Username is required",
            pattern: emailPattern,
          })}
          placeholder="Email"
          type="email"
          required
        />
        {errors.username && (
          <FormErrorMessage>{errors.username.message}</FormErrorMessage>
        )}
      </FormControl>

      <FormControl id="password" isInvalid={!!error}>
        <InputGroup>
          <Input
            {...register("password", { required: "Password is required" })}
            type={show ? "text" : "password"}
            placeholder="Password"
            required
          />
          <InputRightElement color="gray.400" _hover={{ cursor: "pointer" }}>
            <Icon
              as={show ? ViewOffIcon : ViewIcon}
              onClick={setShow.toggle}
              aria-label={show ? "Hide password" : "Show password"}
            />
          </InputRightElement>
        </InputGroup>
        {error && <FormErrorMessage>{error}</FormErrorMessage>}
      </FormControl>

      <Link
        as={RouterLink}
        to="/recover-password"
        fontWeight="600"
        alignSelf="flex-end"
      >
        Forgot password?
      </Link>

      <Button
        type="submit"
        isLoading={isSubmitting}
        w="full"
      >
        Log In
      </Button>

      <Text color="subtle" textAlign="center">
        Don't have an account?{" "}
        <Link
          as={RouterLink}
          to="/signup"
          fontWeight="600"
        >
          Sign up
        </Link>
      </Text>

      <Flex direction="row" justify="center" align="center" gap={4} mt={8}>
        <GitHubLogo />
        <LinkedInLogo />
        <XLogo />
      </Flex>
      </Container>
    </Flex>
  )
}

export default Login
